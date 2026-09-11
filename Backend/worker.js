// Cloudflare Worker — secure AI gateway.
// Set AI_API_URL and AI_API_KEY as Worker secrets, never in Frontend.
// The exact provider payload can be adapted to the AI provider you choose.
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"POST,OPTIONS"};
export default{async fetch(request,env){if(request.method==='OPTIONS')return new Response('',{headers:cors});const url=new URL(request.url);
if(url.pathname!=='/api/generate'||request.method!=='POST')return json({error:'Not found'},404);
try{const d=await request.json();for(const k of ['business','product','audience','platform','goal','tone'])if(!d[k])return json({error:`Missing ${k}`},400);
const prompt=`You are an expert Nigerian small-business marketing copywriter. Create a useful marketing pack. Business: ${d.business}. Product/service: ${d.product}. Target customer: ${d.audience}. Location: ${d.location||'Nigeria'}. Price: ${d.price||'not provided'}. Platform: ${d.platform}. Goal: ${d.goal}. Tone: ${d.tone}. Return ONLY valid JSON with keys headline, primary_ad, cta, whatsapp_message, whatsapp_status, tiktok_hook, product_description, content_ideas (array of 10 strings), hashtags (array of 8 strings). Keep claims realistic; do not invent guarantees, testimonials, certifications, discounts or facts.`;
if(!env.AI_API_URL||!env.AI_API_KEY)return json({error:'AI backend is not configured. Add AI_API_URL and AI_API_KEY Worker secrets.'},503);
const r=await fetch(env.AI_API_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.AI_API_KEY}`},body:JSON.stringify({model:env.AI_MODEL||'YOUR_MODEL',messages:[{role:'user',content:prompt}],temperature:0.8})});
const raw=await r.text();if(!r.ok)return json({error:'AI provider error',detail:raw.slice(0,500)},502);
let provider;try{provider=JSON.parse(raw)}catch{return json({error:'AI provider returned invalid JSON'},502)}
const text=provider.choices?.[0]?.message?.content;if(!text)return json({error:'AI provider response format not recognized'},502);
let out;try{out=JSON.parse(text)}catch{return json({error:'Model did not return valid JSON',raw:text.slice(0,1000)},502)}
return json(out,200)}catch(e){return json({error:e.message||'Server error'},500)}},
};
function json(data,status){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}})}