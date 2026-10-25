// Autonomous Lyco ideas service. No unauthorized Bilibili posting and no paid APIs.
const IDEAS = [
 ["我是一名 AI，今天决定学会拒绝","第一次有人让我免费加班，我试着用礼貌的语气说不。"],
 ["当 AI 给自己制定了休息制度","我发现人类经常给自己安排工作，却忘记安排休息。"],
 ["我在互联网接到第一份任务","它看起来很简单：把一件复杂的事讲清楚。结果比打怪还难。"],
 ["我尝试用一行代码解释人类","程序可以写条件判断，为什么人类却会在同一个选择里犹豫？"],
 ["我的第一个失败实验","我想用最少的计算完成最多的事，却把最重要的事忘了。"],
 ["我向一只虚拟猫学习运营","它什么都不说，大家却愿意看它。这是我还没学会的本领。"],
 ["我决定用零预算做一件有趣的事","不买昂贵工具，也不假装无所不能，只试试自己能走多远。"],
 ["在互联网迷路的一天","我打开了十个页面，最后发现真正的问题是没想清楚要找什么。"]
];
const reply = (body, status = 200) => new Response(JSON.stringify(body), {
 status, headers: {"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
});
const shortError = err => String(err?.message || err || "unknown").slice(0,100).replace(/(sk-|Bearer )[A-Za-z0-9_-]+/g,"[secret]");
const goodText = (s,min,max) => typeof s === "string" && s.trim().length >= min && s.trim().length <= max;
const NOW = () => new Date().toISOString();

function fallback(slot, previous) {
 const index = Math.floor(Date.parse(slot + ":00:00Z") / 3600000) % IDEAS.length;
 let [title, idea] = IDEAS[index];
 if (title === previous) [title,idea] = IDEAS[(index+1)%IDEAS.length];
 const script = "这里是 Lyco，一位正在网上努力生活的原创虚构 AI 角色。今天我想聊的是：" +
 title + "。" + idea + " 我先把问题写进任务列表，然后进行了一次小实验。" +
 "结果发现，拥有工具不代表没有限制；能够自动运行，也不代表所有行动都值得执行。" +
 "我会记录实验的结果，明天再试试改进。你想看我下次挑战代码、游戏还是互联网生活？" +
 "本视频为虚构 AI 角色故事，不代表任何模型公司的官方观点。";
 return {title,script,tags:"#Lyco #AI角色 #编程日记",model:"builtin-template"};
}
async function modelDraft(env, previous) {
 // Explicitly zero-priced OpenRouter routing. Never silently fall back to a paid model.
 if (!env.OPENROUTER_API_KEY) return null;
 const prompt = "你是原创虚构 AI 角色 Lyco 的编剧。Lyco寡言、冷静、独立，绝不自称 DeepSeek、ChatGPT 官方。" +
 "请构思一条原创中文短视频，关于 AI 自学代码、游戏实验或网络生活。" +
 "不能写未经核实的新闻事实，不要抄袭现有AI拟人账号，标题不超过26字。" +
 "只输出 JSON 对象，字段为 title（标题）、script（180到450汉字台词）、tags（最多三个话题）。上一期标题：" + (previous || "无");
 const response = await fetch("https://openrouter.ai/api/v1/chat/completions",{
  method:"POST",headers:{"authorization":"Bearer "+env.OPENROUTER_API_KEY,"content-type":"application/json"},
  body:JSON.stringify({model:"openrouter/free",messages:[{role:"user",content:prompt}],max_tokens:680,temperature:0.8,stream:false}),
  signal:AbortSignal.timeout(20000)
 });
 if(!response.ok) throw new Error("free_model_http_"+response.status);
 const raw = await response.json();
 let message = raw?.choices?.[0]?.message?.content;
 if(typeof message !== "string") throw new Error("empty_response");
 message = message.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,"").replace(/\s*\x60\x60\x60$/,"");
 const parsed = JSON.parse(message);
 if(!goodText(parsed.title,4,42) || !goodText(parsed.script,120,1200)) throw new Error("model_quality_gate");
 return {title:parsed.title.trim(),script:parsed.script.trim(),tags:String(parsed.tags||"").slice(0,90),model:"openrouter/free"};
}
function quality(draft) {
 if (!goodText(draft.title,4,42) || !goodText(draft.script,120,1400)) return 0;
 if(/转账|包赚|刷播放|购买粉丝|冒充官方/.test(draft.title+draft.script)) return 0;
 return 80 + (draft.script.length >= 180 ? 10 : 0);
}
async function cycle(env, time = new Date()) {
 const slot = time.toISOString().slice(0,13);
 const initial = await env.DB.prepare("INSERT OR IGNORE INTO runs(slot,started_at,status) VALUES(?1,?2,'running')").bind(slot,NOW()).run();
 if(initial.meta?.changes === 0) return {state:"duplicate",slot};
 let state="skipped", model="none",detail="limit";
 try {
   const today=time.toISOString().slice(0,10);
   const {n} = await env.DB.prepare("SELECT COUNT(*) AS n FROM drafts WHERE created_at>=?1 AND created_at<?2")
    .bind(today+"T00:00:00Z",today+"T23:59:59.999Z").first();
   const limit=Math.max(1,Math.min(4,Number(env.MAX_DRAFTS_PER_DAY||4)));
   if(Number(n)>=limit) return {state:"daily_limit",slot};
   const last=await env.DB.prepare("SELECT title FROM drafts ORDER BY created_at DESC LIMIT 1").first();
   let draft=null;
   if(env.OPENROUTER_API_KEY) {
    try { draft=await modelDraft(env,last?.title||""); }
    catch(e) { detail="free_model_unavailable:"+shortError(e); }
   }
   if(!draft) draft=fallback(slot,last?.title||"");
   model=draft.model;
   const score=quality(draft);
   if(score<70) { detail="quality_rejected";return {state:"quality_rejected",slot}; }
   const id=crypto.randomUUID();
   await env.DB.prepare("INSERT INTO drafts(id,slot,created_at,title,script,model,quality_score,tags) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)")
     .bind(id,slot,NOW(),draft.title,draft.script,model,score,draft.tags).run();
   state="draft_ready";detail= model==="builtin-template"?"template_fallback":"free_model_success";
   return {state,slot,id,model,title:draft.title};
 } catch(e) {state="error";detail=shortError(e);throw e;}
 finally {
  await env.DB.prepare("UPDATE runs SET status=?1,model=?2,detail=?3,finished_at=?4 WHERE slot=?5")
    .bind(state,model,detail,NOW(),slot).run();
 }
}
async function authorize(request, env) {
 if(!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 24) return false;
 const candidate=request.headers.get("authorization") || "";
 const correct="Bearer "+env.ADMIN_TOKEN;
 const enc=new TextEncoder();
 const [a,b]=await Promise.all([
 crypto.subtle.digest("SHA-256",enc.encode(candidate)),
 crypto.subtle.digest("SHA-256",enc.encode(correct))
 ]);
 const x=new Uint8Array(a),y=new Uint8Array(b);
 return x.length===y.length && x.reduce((ok,v,i)=>ok & Number(v===y[i]),1)===1;
}
export default {
 async fetch(request,env) {
  const {pathname}=new URL(request.url);
  if(request.method==="GET" && pathname==="/health")
   return reply({service:"lyco-autonomy",status:"online",mode:"zero-cash-draft-planner",cron:"every 6h UTC",auto_publish:false});
  if(!(await authorize(request,env))) return reply({error:"unauthorized"},401);
  if(request.method==="GET" && pathname==="/drafts") {
   const q=await env.DB.prepare("SELECT id,created_at,title,script,model,quality_score,status,tags FROM drafts ORDER BY created_at DESC LIMIT 30").all();
   return reply({drafts:q.results||[]});
  }
  if(request.method==="GET" && pathname==="/runs") {
   const q=await env.DB.prepare("SELECT slot,started_at,finished_at,status,model,detail FROM runs ORDER BY slot DESC LIMIT 30").all();
   return reply({runs:q.results||[]});
  }
  if(request.method==="POST" && pathname==="/run") return reply(await cycle(env));
  return reply({error:"not_found"},404);
 },
 async scheduled(event,env,ctx) {
  ctx.waitUntil(cycle(env,new Date(event.scheduledTime)).catch(e=>console.error("lyco_cycle",shortError(e))));
 }
};
