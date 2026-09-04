
import { useEffect,useMemo,useRef,useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { io,Socket } from "socket.io-client";
import { api,getToken,API } from "../lib/api";
import { getOrCreateIdentity,encryptText,decryptText,encryptBlob,decryptBlob,E2EIdentity } from "../lib/e2e";

type User={id:string;username:string;displayName:string;avatar?:string;bio?:string;online?:boolean;lastSeenAt?:string;publicKey?:string};
type Attachment={url:string;name:string;mime:string;size:number;duration?:number;encrypted?:boolean};
type Message={id:string;conversationId:string;senderId:string;content:string;createdAt:string;seenAt?:string;editedAt?:string;deletedAt?:string;replyToId?:string;attachment?:Attachment;reactions?:Record<string,string[]>};
type Conversation={id:string;title:string;avatar?:string;members:User[];lastMessage?:Message;unread?:number;updatedAt:string};
const SOCKET_URL=process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:4000";
function Icon({name}:{name:string}){const c={width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};const p:Record<string,ReactNode>={search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,edit:<><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,send:<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,plus:<><path d="M12 5v14M5 12h14"/></>,moon:<path d="M20 15.5A8.5 8.5 0 1 1 8.5 4 6.7 6.7 0 0 0 20 15.5Z"/>,logout:<><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-5"/></>,back:<path d="m15 18-6-6 6-6"/>,check:<path d="m5 12 4 4L19 6"/>,paperclip:<><path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7L9.7 17.7a2 2 0 0 1-2.8-2.8l8.5-8.5"/></>,mic:<><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></>,reply:<><path d="M9 17 4 12l5-5"/><path d="M4 12h10a6 6 0 0 1 6 6v1"/></>,trash:<><path d="M3 6h18"/><path d="M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></>,pin:<><path d="m15 4 5 5-4 4v5l-4-4H7l4-4Z"/></>};return <svg {...c}>{p[name]}</svg>}
function Avatar({user,size="md"}:{user?:User,size?:"sm"|"md"|"lg"}){return <div className={`avatar ${size}`}>{user?.avatar?<img src={user.avatar} alt=""/>:(user?.displayName||"?").slice(0,1)}</div>}
function formatSize(n:number){if(n<1024)return `${n} B`;if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;return `${(n/1024/1024).toFixed(1)} MB`}
function timeAgo(d?:string){if(!d)return "";const sec=Math.floor((Date.now()-new Date(d).getTime())/1000);if(sec<60)return "همین الان";if(sec<3600)return `${Math.floor(sec/60)} دقیقه پیش`;if(sec<86400)return `${Math.floor(sec/3600)} ساعت پیش`;return new Date(d).toLocaleDateString("fa-IR")}

export default function Messenger(){
 const[hydrated,setHydrated]=useState(false),[auth,setAuth]=useState(false),[mode,setMode]=useState<"login"|"register">("login"),[user,setUser]=useState<User|null>(null),[conversations,setConversations]=useState<Conversation[]>([]),[contacts,setContacts]=useState<User[]>([]),[selected,setSelected]=useState<Conversation|null>(null),selectedRef=useRef<Conversation|null>(null),[messages,setMessages]=useState<Message[]>([]),[typing,setTyping]=useState(false),[socketConnected,setSocketConnected]=useState(false),[query,setQuery]=useState(""),[text,setText]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[mobilePanel,setMobilePanel]=useState<"list"|"chat">("list"),[dark,setDark]=useState(false),[addOpen,setAddOpen]=useState(false),[username,setUsername]=useState(""),[addBusy,setAddBusy]=useState(false),[addError,setAddError]=useState(""),[replyTo,setReplyTo]=useState<Message|null>(null),[editId,setEditId]=useState<string|null>(null),[editText,setEditText]=useState(""),[lightbox,setLightbox]=useState<string|null>(null),[pinned,setPinned]=useState<Message|undefined>(),[recording,setRecording]=useState(false);
 const socketRef=useRef<Socket|null>(null),userRef=useRef<User|null>(null),identityRef=useRef<E2EIdentity|null>(null),typingTimer=useRef<ReturnType<typeof setTimeout>|null>(null),mediaRef=useRef<MediaRecorder|null>(null),chunksRef=useRef<Blob[]>([]);
 useEffect(()=>{selectedRef.current=selected},[selected]); useEffect(()=>{userRef.current=user},[user]); useEffect(()=>{setAuth(Boolean(getToken()));setHydrated(true)},[]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return q?conversations.filter(c=>c.title.toLowerCase().includes(q)||c.lastMessage?.content.toLowerCase().includes(q)):conversations},[conversations,query]);
 async function ensureE2E(me:User){
  const identity=await getOrCreateIdentity(me.id);
  identityRef.current=identity;
  if(me.publicKey!==identity.publicKey){
    const updated=await api<User>("/users/me/keys",{method:"PUT",body:JSON.stringify({publicKey:identity.publicKey})});
    setUser(prev=>prev?{...prev,publicKey:updated.publicKey}:prev);
  }
 }
 async function decryptMessage(m:Message,c?:Conversation){
  if(m.deletedAt||!m.content.startsWith("e2e:v1:")) return m;
  const identity=identityRef.current; const conv=c||selectedRef.current;
  const other=conv?.members.find(x=>x.id!==userRef.current?.id)||conv?.members[0];
  if(!identity||!other?.publicKey) return m;
  try{return {...m,content:await decryptText(m.content,identity,other.publicKey,m.conversationId)}}catch{return {...m,content:"[پیام رمزنگاری‌شده قابل بازیابی نیست]"}}
 }
 async function decryptList(items:Message[],c:Conversation){return Promise.all(items.map(m=>decryptMessage(m,c)))}
 async function load(){setLoading(true);try{const[me,cs,ct]=await Promise.all([api<User>("/users/me"),api<{items:Conversation[]}>("/conversations"),api<{items:User[]}>("/users/contacts")]);setUser(me);setConversations(cs.items);setContacts(ct.items);await ensureE2E(me);if(cs.items.length&&!selectedRef.current)setSelected(cs.items[0]);}catch(e){setError(e instanceof Error?e.message:"خطا در ارتباط با سرور");setAuth(false);localStorage.removeItem("chat_token")}finally{setLoading(false)}}
 useEffect(()=>{
  if(!hydrated || !auth) return;
  let cancelled=false;

  const initialize=async()=>{
    try{
      await load();
    }catch{}
    if(cancelled) return;

    const s=io(SOCKET_URL,{
      auth:{token:getToken()},
      transports:["websocket","polling"],
      reconnection:true
    });
    socketRef.current=s;

    const onConnect=()=>{
      setSocketConnected(true);
      const cid=selectedRef.current?.id;
      if(cid) s.emit("conversation:join",cid);
    };
    const onDisconnect=()=>setSocketConnected(false);
    const onMessage=async(m:Message)=>{
      const conv=conversations.find(c=>c.id===m.conversationId)||selectedRef.current||undefined;
      const dm=await decryptMessage(m,conv);
      setConversations(prev=>prev
        .map(c=>c.id===m.conversationId
          ? {...c,lastMessage:dm,updatedAt:m.createdAt,unread:m.conversationId===selectedRef.current?.id?0:(c.unread||0)+(m.senderId===userRef.current?.id?0:1)}
          : c)
        .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
      );
      if(m.conversationId===selectedRef.current?.id){
        setMessages(prev=>prev.some(x=>x.id===dm.id)?prev:[...prev,dm]);
      }else if(m.senderId!==userRef.current?.id){
        if(typeof Notification!=="undefined" && Notification.permission==="granted"){
          new Notification("پیام جدید در ChatApp",{body:m.content||"فایل جدید"});
        }
        document.title="● پیام جدید · ChatApp";
      }
    };
    const onUpdated=async(m:Message)=>{
      const dm=await decryptMessage(m);
      setMessages(prev=>prev.map(x=>x.id===dm.id?dm:x));
      setConversations(prev=>prev.map(c=>c.lastMessage?.id===dm.id?{...c,lastMessage:dm}:c));
    };
    const onSeen=(p:{conversationId:string;messageIds:string[];seenAt:string})=>{
      setMessages(prev=>prev.map(m=>p.messageIds.includes(m.id)?{...m,seenAt:p.seenAt}:m));
      setConversations(prev=>prev.map(c=>c.id===p.conversationId&&c.lastMessage&&p.messageIds.includes(c.lastMessage.id)
        ?{...c,lastMessage:{...c.lastMessage,seenAt:p.seenAt}}
        :c));
    };
    const onPresence=(u:User)=>{
      setContacts(prev=>prev.map(x=>x.id===u.id?{...x,...u}:x));
      setConversations(prev=>prev.map(c=>({...c,members:c.members.map(m=>m.id===u.id?{...m,...u}:m)})));
      setUser(prev=>prev&&prev.id===u.id?{...prev,...u}:prev);
    };
    const onTyping=(p:{conversationId:string;userId:string;typing:boolean})=>{
      if(p.conversationId===selectedRef.current?.id && p.userId!==userRef.current?.id){
        setTyping(Boolean(p.typing));
      }
    };
    const onPinned=(p:{conversationId:string;messageId:string|null})=>{
      if(p.conversationId!==selectedRef.current?.id) return;
      if(!p.messageId){setPinned(undefined);return;}
      setMessages(prev=>{
        const found=prev.find(m=>m.id===p.messageId);
        if(found) setPinned(found);
        return prev;
      });
    };
    const onContactAdded=(u:User)=>{
      setContacts(prev=>prev.some(x=>x.id===u.id)?prev:[...prev,u]);
    };
    const onConnectError=()=>setError("اتصال بلادرنگ برقرار نشد؛ تلاش مجدد خودکار فعال است.");

    s.on("connect",onConnect);
    s.on("disconnect",onDisconnect);
    s.on("message:new",onMessage);
    s.on("message:updated",onUpdated);
    s.on("message:seen",onSeen);
    s.on("presence:update",onPresence);
    s.on("typing",onTyping);
    s.on("message:pinned",onPinned);
    s.on("contact:added",onContactAdded);
    s.on("connect_error",onConnectError);

    if(typeof Notification!=="undefined" && Notification.permission==="default"){
      Notification.requestPermission().catch(()=>{});
    }

    if(selectedRef.current) s.emit("conversation:join",selectedRef.current.id);
  };

  initialize();

  return()=>{
    cancelled=true;
    const s=socketRef.current;
    if(s){
      s.removeAllListeners();
      s.disconnect();
    }
    socketRef.current=null;
    setSocketConnected(false);
  };
 },[auth,hydrated]);
 useEffect(()=>{
  if(!selected) return;
  let cancelled=false;
  const cid=selected.id;

  const openConversation=async()=>{
    try{
      const r=await api<{items:Message[];pinned?:Message}>(`/messages?conversationId=${encodeURIComponent(cid)}`);
      if(cancelled) return;
      if(!identityRef.current && userRef.current){
        await ensureE2E(userRef.current);
      }

      const decryptedMessages=await decryptList(r.items,selected);
      let decryptedPinned=r.pinned;
      if(decryptedPinned){
        decryptedPinned=await decryptMessage(decryptedPinned,selected);
      }
      if(cancelled) return;

      setMessages(decryptedMessages);
      setPinned(decryptedPinned);
    }catch(e){
      if(!cancelled) setError(e instanceof Error?e.message:"خطا در دریافت پیام‌ها");
    }
  };

  openConversation();
  const s=socketRef.current;
  if(s?.connected) s.emit("conversation:join",cid);
  setTyping(false);
  setMobilePanel("chat");
  setConversations(prev=>prev.map(c=>c.id===cid?{...c,unread:0}:c));
  if(s?.connected) s.emit("conversation:read",cid);

  return()=>{
    cancelled=true;
    if(typingTimer.current){
      clearTimeout(typingTimer.current);
      typingTimer.current=null;
    }
    if(s?.connected) s.emit("typing:stop",cid);
  };
 },[selected?.id]);

 useEffect(()=>{
  if(!selected) return;
  const s=socketRef.current;
  if(s?.connected) s.emit("conversation:read",selected.id);
 },[selected?.id,messages.length]);

 useEffect(()=>{
  document.title="ChatApp";
  return()=>{document.title="ChatApp"};
 },[]);
 async function submitAuth(e:FormEvent){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget as HTMLFormElement);try{const r=await api<any>(`/auth/${mode}`,{method:"POST",body:JSON.stringify({username:String(f.get("username")||""),password:String(f.get("password")||""),displayName:String(f.get("displayName")||"")})});localStorage.setItem("chat_token",r.token);setUser(r.user);setAuth(true)}catch(e){setError(e instanceof Error?e.message:"عملیات ناموفق بود")}finally{setBusy(false)}}
 async function addContact(){if(!username.trim())return;setAddBusy(true);setAddError("");try{const c=await api<User>("/users/contacts",{method:"POST",body:JSON.stringify({username:username.trim()})});setContacts(p=>p.some(x=>x.id===c.id)?p:[...p,c]);setUsername("");setAddOpen(false)}catch(e){setAddError(e instanceof Error?e.message:"افزودن مخاطب ناموفق بود")}finally{setAddBusy(false)}}
 async function createConversation(contactId:string){try{const c=await api<Conversation>("/conversations",{method:"POST",body:JSON.stringify({userId:contactId})});setConversations(p=>[c,...p.filter(x=>x.id!==c.id)]);setSelected(c)}catch(e){setError(e instanceof Error?e.message:"ساخت گفتگو ناموفق بود")}}
 function emitMessage(payload:any){const s=socketRef.current;if(!s?.connected||!selectedRef.current)return;return new Promise<Message>((resolve,reject)=>s.timeout(5000).emit("message:send",payload,(err:any,m:Message)=>err?reject(err):resolve(m)))}
 async function send(){const content=text.trim();if(!content&&!replyTo)return;try{const cid=selectedRef.current!.id;const other=selectedRef.current!.members.find(x=>x.id!==userRef.current?.id)||selectedRef.current!.members[0];if(!identityRef.current||!other?.publicKey)throw new Error("کلید عمومی مخاطب آماده نیست");const encrypted=content?await encryptText(content,identityRef.current,other.publicKey,cid):"";const m=await emitMessage({conversationId:cid,content:encrypted,replyToId:replyTo?.id});const dm={...m,content};setMessages(p=>p.some(x=>x.id===m.id)?p:[...p,dm]);setText("");setReplyTo(null);socketRef.current?.emit("typing:stop",cid)}catch{setError("ارسال پیام انجام نشد؛ رمزنگاری یا اتصال را بررسی کنید")}}
 async function upload(file:File,duration?:number){try{const cid=selectedRef.current!.id;const other=selectedRef.current!.members.find(x=>x.id!==userRef.current?.id)||selectedRef.current!.members[0];if(!identityRef.current||!other?.publicKey)throw new Error();const encryptedFile=await encryptBlob(file,identityRef.current,other.publicKey,cid);const fd=new FormData();fd.append("file",encryptedFile,`${file.name}.e2e`);const r=await api<any>("/uploads",{method:"POST",body:fd});const attachment={...r.attachment,name:file.name,mime:file.type||"application/octet-stream",size:file.size,duration,encrypted:true};const m=await emitMessage({conversationId:cid,content:"",attachment});setMessages(p=>p.some(x=>x.id===m.id)?p:[...p,m])}catch{setError("آپلود فایل رمزنگاری‌شده انجام نشد")}}
 function chooseFile(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(f)upload(f);e.target.value=""}
 async function startRecording(){if(recording){mediaRef.current?.stop();return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const rec=new MediaRecorder(stream);chunksRef.current=[];rec.ondataavailable=e=>e.data.size&&chunksRef.current.push(e.data);rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunksRef.current,{type:rec.mimeType||"audio/webm"});setRecording(false);upload(new File([blob],`voice-${Date.now()}.webm`,{type:blob.type}))};mediaRef.current=rec;rec.start();setRecording(true)}catch{setError("دسترسی به میکروفون ممکن نیست")}}
 function editMessage(m:Message){setEditId(m.id);setEditText(m.content)}
 async function saveEdit(){if(!editId||!editText.trim()||!selectedRef.current)return;try{const other=selectedRef.current.members.find(x=>x.id!==userRef.current?.id)||selectedRef.current.members[0];if(!identityRef.current||!other?.publicKey)throw new Error();const encrypted=await encryptText(editText.trim(),identityRef.current,other.publicKey,selectedRef.current.id);socketRef.current?.timeout(5000).emit("message:edit",{id:editId,content:encrypted},()=>{});setEditId(null);setEditText("")}catch{setError("ویرایش پیام انجام نشد")}}
 function deleteMessage(m:Message){socketRef.current?.emit("message:delete",{id:m.id})} function react(m:Message,e:string){socketRef.current?.emit("message:react",{id:m.id,emoji:e})} function pin(m:Message){socketRef.current?.emit("message:pin",{conversationId:m.conversationId,messageId:pinned?.id===m.id?null:m.id});setPinned(pinned?.id===m.id?undefined:m)} async function forward(m:Message){const name=window.prompt("نام کاربری مقصد را وارد کنید");if(!name)return;const target=conversations.find(c=>c.members.some(x=>x.username===name.trim().toLowerCase()));if(!target){setError("گفتگویی با این مخاطب پیدا نشد");return}try{const other=target.members.find(x=>x.id!==userRef.current?.id)||target.members[0];if(!identityRef.current||!other?.publicKey)throw new Error();const encrypted=await encryptText(m.content,identityRef.current,other.publicKey,target.id);const sent=await emitMessage({conversationId:target.id,content:encrypted});setConversations(prev=>prev.map(c=>c.id===target.id?{...c,lastMessage:{...sent,content:m.content},updatedAt:sent.createdAt}:c));}catch{setError("ارسال مجدد پیام انجام نشد")}}
 function onText(v:string){setText(v);const cid=selectedRef.current?.id;if(!cid)return;socketRef.current?.emit("typing:start",cid);if(typingTimer.current)clearTimeout(typingTimer.current);typingTimer.current=setTimeout(()=>socketRef.current?.emit("typing:stop",cid),900)}
 function logout(){socketRef.current?.disconnect();localStorage.removeItem("chat_token");setAuth(false);setUser(null);setConversations([]);setContacts([]);setSelected(null);setMessages([])}
 if(!hydrated)return <div className="loading-screen">در حال آماده‌سازی فضای گفتگو…</div>; if(!auth)return <AuthScreen mode={mode} setMode={setMode} onSubmit={submitAuth} busy={busy} error={error}/>; if(loading)return <div className="loading-screen">در حال آماده‌سازی فضای گفتگو…</div>;
 const other=selected?.members.find(m=>m.id!==user?.id)||selected?.members[0];
 if(typeof window!=="undefined"){(window as any).__chatappSelectedConversationId=selected?.id;(window as any).__chatappOtherPublicKey=other?.publicKey;}
 return <main className={`app-shell ${dark?"dark":""}`}>
  <aside className={`sidebar ${mobilePanel==="chat"?"mobile-hidden":""}`}><div className="side-head"><div className="brand"><div className="brand-mark">C</div><div><b>ChatApp</b><span>فضای گفتگوی شما</span></div></div><button className="icon-btn" onClick={()=>setAddOpen(true)}><Icon name="plus"/></button></div><div className="search-box"><Icon name="search"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی گفتگوها..."/></div><div className="list-title"><span>گفتگوها</span><span>{conversations.length}</span></div><div className="conversation-list">{visible.map(c=>{const o=c.members.find(m=>m.id!==user?.id)||c.members[0];return <button className={`conversation ${selected?.id===c.id?"active":""}`} key={c.id} onClick={()=>setSelected(c)}><Avatar user={o}/><div className="conv-main"><div className="conv-top"><b>{c.title}</b><time>{c.lastMessage?new Date(c.lastMessage.createdAt).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"}):""}</time></div><div className="conv-bottom"><span>{c.lastMessage?.deletedAt?"پیام حذف شد":c.lastMessage?.content||"شروع یک گفتگوی تازه"}</span>{!!c.unread&&<em>{c.unread}</em>}</div></div></button>})}{!visible.length&&<div className="empty-list">هنوز گفتگویی ندارید.<br/>از + مخاطب اضافه کنید.</div>}</div><div className="sidebar-bottom"><div className="profile-mini"><Avatar user={user}/><div><b>{user?.displayName}</b><span>@{user?.username}</span></div><i className="online-dot"/></div><button className="logout-btn" onClick={logout}><Icon name="logout"/></button></div></aside>
  <section className={`main-area ${mobilePanel==="list"?"mobile-hidden-chat":""}`}>{selected?<ChatView selected={selected} user={user!} other={other} messages={messages} text={text} onText={onText} send={send} onBack={()=>setMobilePanel("list")} socketConnected={socketConnected} typing={typing} replyTo={replyTo} setReplyTo={setReplyTo} editId={editId} editText={editText} setEditText={setEditText} saveEdit={saveEdit} editMessage={editMessage} deleteMessage={deleteMessage} react={react} pin={pin} pinned={pinned} chooseFile={chooseFile} startRecording={startRecording} recording={recording} forward={forward} lightbox={lightbox} setLightbox={setLightbox}/>:<EmptyChat contacts={contacts} createConversation={createConversation} onAdd={()=>setAddOpen(true)}/>}</section>
  <aside className="right-panel"><div className="rp-head"><span>مخاطبین شما</span><button className="icon-btn" onClick={()=>setAddOpen(true)}><Icon name="plus"/></button></div><div className="contact-list">{contacts.map(c=><button className="contact" key={c.id} onClick={()=>createConversation(c.id)}><Avatar user={c}/><div><b>{c.displayName}</b><span>{c.online?"آنلاین":`آخرین بازدید ${timeAgo(c.lastSeenAt)}`}</span></div><i className={c.online?"online-dot":""}/></button>)}</div><div className="security-card"><div className="shield">🔐</div><div><b>رمزنگاری سرتاسری فعال</b><span>پیام و فایل قبل از ارسال رمزنگاری می‌شود</span></div></div><button className="theme-btn" onClick={()=>setDark(!dark)}><Icon name="moon"/>{dark?"حالت روشن":"حالت تاریک"}</button></aside>
  {addOpen&&<div className="modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&setAddOpen(false)}><div className="add-modal" dir="rtl"><button className="modal-close" onClick={()=>setAddOpen(false)}>×</button><div className="modal-icon"><Icon name="plus"/></div><h2>افزودن مخاطب</h2><p>نام کاربری مخاطب را وارد کنید.</p><input autoFocus value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addContact()} placeholder="مثلاً sara"/>{addError&&<div className="error-box">{addError}</div>}<button className="primary-btn" disabled={addBusy||!username.trim()} onClick={addContact}>{addBusy?"در حال افزودن…":"افزودن به مخاطبین"}</button></div></div>}
 </main>
}

function ChatView(p:any){const bottom=useRef<HTMLDivElement>(null);useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"})},[p.messages.length]);return <div className="chat"><header className="chat-head"><button className="mobile-back icon-btn" onClick={p.onBack}><Icon name="back"/></button><Avatar user={p.other}/><div className="chat-identity"><b>{p.other?.displayName||p.selected.title}</b><span><i className={p.other?.online?"online-dot":""}/>{p.other?.online?"آنلاین":`آخرین بازدید ${timeAgo(p.other?.lastSeenAt)}`}</span></div><span className={`live-status ${p.socketConnected?"on":""}`}>{p.socketConnected?"● لایو":"○ اتصال"}</span></header>{p.pinned&&<button className="pinned-bar" onClick={()=>document.getElementById(`msg-${p.pinned.id}`)?.scrollIntoView({behavior:"smooth"})}>📌 پیام سنجاق‌شده: {p.pinned.content||p.pinned.attachment?.name}</button>}<div className="message-area"><div className="date-chip">امروز</div>{p.messages.map((m:Message,i:number)=>{const mine=m.senderId===p.user.id;const reactionCount=Object.values(m.reactions||{}).reduce((a,x)=>a+x.length,0);return <div key={m.id} id={`msg-${m.id}`} className={`message-row ${mine?"mine":"theirs"}`}>{!mine?<Avatar user={p.other} size="sm"/>:<div className="avatar-spacer"/>}<div className={`bubble ${i===0||p.messages[i-1].senderId!==m.senderId?"first":""}`}>{m.replyToId&&<div className="reply-preview">↩ {p.messages.find((x:Message)=>x.id===m.replyToId)?.content||"پیام اصلی"}</div>}{m.deletedAt?<div className="deleted">این پیام حذف شده است</div>:m.attachment?<AttachmentView a={m.attachment} onImage={p.setLightbox} conversationId={p.selected.id} otherPublicKey={p.other?.publicKey} userId={p.user.id}/>:null}{!m.deletedAt&&m.content&&<div>{m.content}</div>}<div className="message-tools"><button onClick={()=>p.setReplyTo(m)} title="پاسخ">↩</button>{mine&&!m.deletedAt&&<button onClick={()=>p.editMessage(m)} title="ویرایش">✎</button>}{mine&&!m.deletedAt&&<button onClick={()=>p.deleteMessage(m)} title="حذف"><Icon name="trash"/></button>}<button onClick={()=>p.react(m,"❤️")}>❤️</button><button onClick={()=>p.react(m,"👍")}>👍</button><button onClick={()=>p.forward(m)} title="ارسال مجدد">↗</button><button onClick={()=>p.pin(m)} title="سنجاق">📌</button></div>{reactionCount>0&&<div className="reactions">{Object.entries(m.reactions||{}).filter(([,ids])=>ids.length).map(([e,ids])=><span key={e}>{e} {ids.length}</span>)}</div>}<div className="bubble-meta">{new Date(m.createdAt).toLocaleTimeString("fa-IR",{hour:"2-digit",minute:"2-digit"})}{m.editedAt&&<small>ویرایش شد</small>}{mine&&<span className={`ticks ${m.seenAt?"seen":""}`}><Icon name="check"/>{m.seenAt&&<Icon name="check"/>}</span>}</div></div></div>})}{p.typing&&<div className="typing"><span/> <span/> <span/></div>}<div ref={bottom}/></div>{p.replyTo&&<div className="reply-compose"><span>پاسخ به: {p.replyTo.content||p.replyTo.attachment?.name}</span><button onClick={()=>p.setReplyTo(null)}>×</button></div>}{p.editId&&<div className="edit-compose"><input value={p.editText} onChange={e=>p.setEditText(e.target.value)} autoFocus/><button onClick={p.saveEdit}>ذخیره</button></div>}<div className="composer-wrap"><div className="composer"><label className="attach-btn"><input type="file" hidden onChange={p.chooseFile}/><Icon name="paperclip"/></label><input value={p.text} onChange={e=>p.onText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();p.send()}}} placeholder={p.socketConnected?"پیامتان را بنویسید...":"در حال اتصال..."} disabled={!p.socketConnected}/><button className={`record-btn ${p.recording?"recording":""}`} onClick={p.startRecording}><Icon name="mic"/></button><button className="send-btn" onClick={p.send} disabled={!p.socketConnected}><Icon name="send"/></button></div><div className="composer-hint">فایل، عکس، ویدئو و ویس · Enter برای ارسال · کاملاً بلادرنگ</div></div>{p.lightbox&&<div className="lightbox" onClick={()=>p.setLightbox(null)}><img src={p.lightbox} alt=""/></div>}</div>}
function AttachmentView({a,onImage,conversationId,otherPublicKey,userId}:{a:Attachment;onImage:(u:string)=>void;conversationId:string;otherPublicKey?:string;userId:string}){const[url,setUrl]=useState("");useEffect(()=>{let live=true;let objectUrl="";const run=async()=>{try{const raw=`${API.replace(/\/api$/i,"")}${a.url}`;if(!a.encrypted){if(live)setUrl(raw);return}if(!otherPublicKey)throw new Error();const identity=await getOrCreateIdentity(userId);const res=await fetch(raw);const blob=await res.blob();const plain=await decryptBlob(blob,identity,otherPublicKey,conversationId,a.mime);objectUrl=URL.createObjectURL(plain);if(live)setUrl(objectUrl);}catch{if(live)setUrl("")}};run();return()=>{live=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}} ,[a,conversationId,otherPublicKey,userId]);if(!url)return <div className="file-card">🔐 <div><b>{a.name}</b><small>در حال رمزگشایی…</small></div></div>;if(a.mime.startsWith("image/"))return <img className="message-image" src={url} alt={a.name} onClick={()=>onImage(url)}/>;if(a.mime.startsWith("video/"))return <video className="message-video" controls src={url}/>;if(a.mime.startsWith("audio/"))return <div className="audio-card"><span>🎙️</span><audio controls src={url}/></div>;return <a className="file-card" href={url} download={a.name}>📎 <div><b>{a.name}</b><small>{formatSize(a.size)} · رمزنگاری‌شده</small></div></a>}
function EmptyChat({contacts,createConversation,onAdd}:{contacts:User[];createConversation:(id:string)=>void;onAdd:()=>void}){return <div className="empty-chat"><div className="hero-orb">✦</div><h1>فضای گفتگو آماده است</h1><p>مخاطب اضافه کنید و پیام بفرستید.</p><button className="primary-btn empty-add" onClick={onAdd}><Icon name="plus"/> افزودن مخاطب</button><div className="quick-contacts">{contacts.slice(0,3).map(c=><button key={c.id} onClick={()=>createConversation(c.id)}><Avatar user={c}/>{c.displayName}</button>)}</div></div>}
function AuthScreen({mode,setMode,onSubmit,busy,error}:{mode:"login"|"register";setMode:(m:"login"|"register")=>void;onSubmit:(e:FormEvent)=>void;busy:boolean;error:string}){return <div className="auth-page"><div className="auth-card"><div className="auth-brand"><div className="brand-mark big">C</div><div><b>ChatApp</b><span>گفتگو، ساده و حرفه‌ای</span></div></div><div className="auth-copy"><span className="eyebrow">{mode==="login"?"خوش آمدید":"شروع کنید"}</span><h1>{mode==="login"?"ورود به حساب":"ساخت حساب جدید"}</h1><p>{mode==="login"?"برای ادامه وارد فضای شخصی خود شوید.":"در چند ثانیه فضای گفتگوی خودتان را بسازید."}</p></div><form onSubmit={onSubmit} className="auth-form">{mode==="register"&&<label>نام نمایشی<input name="displayName" placeholder="مثلاً علی رضایی"/></label>}<label>نام کاربری<input name="username" required placeholder="username" defaultValue={mode==="login"?"ali":""}/></label><label>رمز عبور<input name="password" required type="password" defaultValue={mode==="login"?"ChangeMe123!":""}/></label>{error&&<div className="error-box">{error}</div>}<button className="primary-btn" disabled={busy}>{busy?"در حال پردازش…":mode==="login"?"ورود به حساب":"ثبت‌نام"}</button></form><button className="switch-btn" onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"حساب ندارم":"حساب دارم"}</button>{mode==="login"&&<div className="demo-note">حساب آزمایشی: <b>ali</b> / <b>ChangeMe123!</b></div>}</div></div>}
