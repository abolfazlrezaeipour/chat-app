import { Body, CanActivate, Controller, Delete, ExecutionContext, Get, Injectable, Module, Post, Put, Req, UnauthorizedException, ForbiddenException, BadRequestException, Param, UploadedFile, UseInterceptors } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from "@nestjs/websockets";
import { FileInterceptor } from "@nestjs/platform-express";
import { Server, Socket } from "socket.io";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID, scryptSync, timingSafeEqual } from "crypto";

 type User = { id:string; username:string; displayName:string; passwordHash:string; bio:string; online:boolean; lastSeenAt?:string; publicKey?:string };
 type PublicUser = Omit<User,"passwordHash">;
 type Attachment = { url:string; name:string; mime:string; size:number; duration?:number };
 type Message = { id:string; conversationId:string; senderId:string; content:string; createdAt:string; seenAt?:string; editedAt?:string; deletedAt?:string; replyToId?:string; attachment?:Attachment; reactions?:Record<string,string[]> };
 type Conversation = { id:string; memberIds:string[]; createdAt:string; updatedAt:string };
 type StoreData = { version:number; users:User[]; contacts:Record<string,string[]>; conversations:Conversation[]; messages:Message[]; readStates:Record<string,Record<string,string>>; pinned:Record<string,string|null> };

@Injectable()
class Store {
  private readonly dir=join(process.cwd(),"data"); private readonly file=join(this.dir,"store.json"); private data:StoreData;
  constructor(){ if(!existsSync(this.dir))mkdirSync(this.dir,{recursive:true}); if(!existsSync(this.file))this.data=this.seed(); else {try{this.data=JSON.parse(readFileSync(this.file,"utf8"));}catch{this.data=this.seed();}this.migrate();} this.save(); }
  private seed():StoreData{const now=new Date().toISOString();const ali={id:"u_ali",username:"ali",displayName:"علی رضایی",passwordHash:this.hash("ChangeMe123!"),bio:"همیشه آنلاین",online:false};const sara={id:"u_sara",username:"sara",displayName:"سارا احمدی",passwordHash:this.hash("ChangeMe123!"),bio:"برای گفتگو آماده‌ام",online:false};return{version:5,users:[ali,sara],contacts:{u_ali:["u_sara"],u_sara:["u_ali"]},conversations:[{id:"c_demo",memberIds:[ali.id,sara.id],createdAt:now,updatedAt:now}],messages:[],readStates:{},pinned:{}};}
  private migrate(){this.data.version=5;this.data.users=Array.isArray(this.data.users)?this.data.users:[];this.data.contacts=this.data.contacts||{};this.data.conversations=Array.isArray(this.data.conversations)?this.data.conversations:[];this.data.messages=Array.isArray(this.data.messages)?this.data.messages:[];this.data.readStates=this.data.readStates||{};this.data.pinned=this.data.pinned||{};for(const u of this.data.users){if(!this.data.contacts[u.id])this.data.contacts[u.id]=[];if(u.lastSeenAt===undefined)u.lastSeenAt=new Date().toISOString();}for(const demo of [{id:"u_ali",username:"ali",password:"ChangeMe123!"},{id:"u_sara",username:"sara",password:"ChangeMe123!"}]){const u=this.data.users.find(x=>x.id===demo.id||x.username===demo.username);if(u)u.passwordHash=this.hash(demo.password);}}
  private hash(p:string){return scryptSync(p,"chatapp-local-salt",64).toString("hex")} verify(p:string,h:string){try{const a=scryptSync(p,"chatapp-local-salt",64),b=Buffer.from(h,"hex");return a.length===b.length&&timingSafeEqual(a,b)}catch{return false}} private save(){writeFileSync(this.file,JSON.stringify(this.data,null,2),"utf8")}
  publicUser(u:User){return{id:u.id,username:u.username,displayName:u.displayName,bio:u.bio,online:u.online,lastSeenAt:u.lastSeenAt,publicKey:u.publicKey}}
  getUser(id:string){return this.data.users.find(u=>u.id===id)} findByUsername(username:string){return this.data.users.find(u=>u.username===username)}
  setPublicKey(id:string,key:string){const u=this.getUser(id);if(!u)throw new UnauthorizedException();u.publicKey=key;this.save();return this.publicUser(u)}
  setOnline(id:string,online:boolean){const u=this.getUser(id);if(!u)return;u.online=online;if(!online)u.lastSeenAt=new Date().toISOString();this.save();return this.publicUser(u)}
  contacts(id:string){const ids=new Set(this.data.contacts[id]||[]);return{items:this.data.users.filter(u=>ids.has(u.id)).map(u=>this.publicUser(u))}}
  addContact(id:string,username:string){const target=this.findByUsername(username.trim().toLowerCase());if(!target)throw new BadRequestException("این نام کاربری پیدا نشد");if(target.id===id)throw new BadRequestException("نمی‌توانید خودتان را اضافه کنید");const list=this.data.contacts[id]||(this.data.contacts[id]=[]);if(!list.includes(target.id)){list.push(target.id);this.save()}return this.publicUser(target)}
  conversations(id:string){return this.data.conversations.filter(c=>c.memberIds.includes(id)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(c=>{const members=c.memberIds.map(x=>this.getUser(x)).filter(Boolean).map(u=>this.publicUser(u!));const other=members.find(u=>u.id!==id)||members[0];const last=this.data.messages.filter(m=>m.conversationId===c.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];const readAt=this.data.readStates[id]?.[c.id];const unread=last&&last.senderId!==id&&(!readAt||last.createdAt>readAt)?this.data.messages.filter(m=>m.conversationId===c.id&&m.senderId!==id&&(!readAt||m.createdAt>readAt)).length:0;return{id:c.id,title:other?.displayName||"گفتگو",members,lastMessage:last,updatedAt:c.updatedAt,unread};})}
  member(cid:string,uid:string){return!!this.data.conversations.find(c=>c.id===cid&&c.memberIds.includes(uid))}
  createConversation(uid:string,target:string){if(!this.data.contacts[uid]?.includes(target))throw new ForbiddenException("ابتدا این کاربر را به مخاطبین اضافه کنید");let c=this.data.conversations.find(x=>x.memberIds.length===2&&x.memberIds.includes(uid)&&x.memberIds.includes(target));if(!c){const now=new Date().toISOString();c={id:randomUUID(),memberIds:[uid,target],createdAt:now,updatedAt:now};this.data.conversations.push(c);this.save()}return this.conversations(uid).find(x=>x.id===c!.id)}
  messages(cid:string){return this.data.messages.filter(m=>m.conversationId===cid).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))}
  messageById(id:string){return this.data.messages.find(m=>m.id===id)}
  markSeen(uid:string,cid:string){if(!this.member(cid,uid))return{ids:[],seenAt:new Date().toISOString()};const now=new Date().toISOString();const ids:string[]=[];for(const m of this.data.messages){if(m.conversationId===cid&&m.senderId!==uid&&!m.seenAt&&!m.deletedAt){m.seenAt=now;ids.push(m.id)}}this.data.readStates[uid]??={};this.data.readStates[uid][cid]=now;if(ids.length||this.data.readStates[uid][cid]===now)this.save();return{ids,seenAt:now}}
  addMessage(uid:string,cid:string,content:string,attachment?:Attachment,replyToId?:string){const clean=content.trim();if(!clean&&!attachment)throw new BadRequestException("پیام خالی است");const now=new Date().toISOString();const m:Message={id:randomUUID(),conversationId:cid,senderId:uid,content:clean,createdAt:now};if(attachment)m.attachment=attachment;if(replyToId&&this.data.messages.some(x=>x.id===replyToId&&x.conversationId===cid))m.replyToId=replyToId;this.data.messages.push(m);const c=this.data.conversations.find(x=>x.id===cid);if(c)c.updatedAt=now;this.save();return m}
  edit(uid:string,id:string,content:string){const m=this.data.messages.find(x=>x.id===id);if(!m||m.senderId!==uid||m.deletedAt)throw new ForbiddenException();if(!content.trim())throw new BadRequestException();m.content=content.trim();m.editedAt=new Date().toISOString();this.save();return m}
  remove(uid:string,id:string){const m=this.data.messages.find(x=>x.id===id);if(!m||m.senderId!==uid)throw new ForbiddenException();m.deletedAt=new Date().toISOString();m.content="";m.attachment=undefined;m.reactions={};this.save();return m}
  react(uid:string,id:string,emoji:string){const m=this.data.messages.find(x=>x.id===id);if(!m||m.deletedAt)throw new BadRequestException();m.reactions??={};for(const key of Object.keys(m.reactions))m.reactions[key]=m.reactions[key].filter(x=>x!==uid);m.reactions[emoji]??=[];if(!m.reactions[emoji].includes(uid))m.reactions[emoji].push(uid);this.save();return m}
  pin(uid:string,cid:string,id:string|null){if(!this.member(cid,uid))throw new ForbiddenException();if(id&&!this.data.messages.some(x=>x.id===id&&x.conversationId===cid))throw new BadRequestException();this.data.pinned[cid]=id;this.save();return id}
  pinnedMessage(cid:string){const id=this.data.pinned[cid];return id?this.data.messages.find(x=>x.id===id):undefined}
  register(username:string,password:string,displayName:string){if(this.data.users.some(u=>u.username===username))throw new ForbiddenException("این نام کاربری قبلاً ثبت شده است");const u={id:randomUUID(),username,displayName:displayName||username,passwordHash:this.hash(password),bio:"",online:false,lastSeenAt:new Date().toISOString()};this.data.users.push(u);this.data.contacts[u.id]=[];this.save();return u}
}

@Injectable() class AuthService{constructor(private store:Store,private jwt:JwtService){}async login(username:string,password:string){const u=this.store.findByUsername(String(username||"").trim().toLowerCase());if(!u||!this.store.verify(password,u.passwordHash))throw new UnauthorizedException("نام کاربری یا رمز عبور اشتباه است");this.store.setOnline(u.id,true);return{token:await this.jwt.signAsync({sub:u.id,username:u.username}),user:this.store.publicUser(u)}}async register(username:string,password:string,displayName:string){const u=this.store.register(String(username||"").trim().toLowerCase(),password,displayName);this.store.setOnline(u.id,true);return{token:await this.jwt.signAsync({sub:u.id,username:u.username}),user:this.store.publicUser(u)}}}
@Injectable() class JwtGuard implements CanActivate{constructor(private jwt:JwtService){}async canActivate(ctx:ExecutionContext){const req=ctx.switchToHttp().getRequest();const h=String(req.headers.authorization||"");if(!h.startsWith("Bearer "))throw new UnauthorizedException();try{req.user=await this.jwt.verifyAsync(h.slice(7));return true}catch{throw new UnauthorizedException()}}}

@WebSocketGateway({cors:{origin:true,credentials:true}})
class ChatGateway{
 @WebSocketServer()server!:Server;constructor(private store:Store,private jwt:JwtService){}
 async handleConnection(s:Socket){try{const p=await this.jwt.verifyAsync(String(s.handshake.auth?.token||"")) as any;s.data.userId=p.sub;this.store.setOnline(p.sub,true);s.join("user:"+p.sub);this.server.emit("presence:update",this.store.publicUser(this.store.getUser(p.sub)!));}catch{s.disconnect(true)}}
 handleDisconnect(s:Socket){const id=s.data.userId;if(!id)return;const remaining=Array.from(this.server.sockets.sockets.values()).some((x)=>x.id!==s.id&&x.data.userId===id);if(!remaining){const u=this.store.setOnline(id,false);if(u)this.server.emit("presence:update",u)}}
 @SubscribeMessage("conversation:join")join(@MessageBody()cid:string,@ConnectedSocket()s:Socket){if(!this.store.member(cid,s.data.userId))return;s.join("conversation:"+cid);const seen=this.store.markSeen(s.data.userId,cid);if(seen.ids.length)this.server.to("conversation:"+cid).emit("message:seen",{conversationId:cid,messageIds:seen.ids,seenAt:seen.seenAt,seenBy:s.data.userId});}
 @SubscribeMessage("conversation:read")read(@MessageBody()cid:string,@ConnectedSocket()s:Socket){const seen=this.store.markSeen(s.data.userId,cid);if(seen.ids.length)this.server.to("conversation:"+cid).emit("message:seen",{conversationId:cid,messageIds:seen.ids,seenAt:seen.seenAt,seenBy:s.data.userId});}
 @SubscribeMessage("typing:start")typing(@MessageBody()cid:string,@ConnectedSocket()s:Socket){if(this.store.member(cid,s.data.userId))s.to("conversation:"+cid).emit("typing",{conversationId:cid,userId:s.data.userId,typing:true})}
 @SubscribeMessage("typing:stop")typingStop(@MessageBody()cid:string,@ConnectedSocket()s:Socket){if(this.store.member(cid,s.data.userId))s.to("conversation:"+cid).emit("typing",{conversationId:cid,userId:s.data.userId,typing:false})}
 @SubscribeMessage("message:send")send(@MessageBody()b:any,@ConnectedSocket()s:Socket){const cid=String(b.conversationId||"");if(!this.store.member(cid,s.data.userId))throw new ForbiddenException();const m=this.store.addMessage(s.data.userId,cid,String(b.content||""),b.attachment,b.replyToId);this.server.to("conversation:"+cid).emit("message:new",m);return m}
 @SubscribeMessage("message:edit")edit(@MessageBody()b:any,@ConnectedSocket()s:Socket){const m=this.store.edit(s.data.userId,String(b.id),String(b.content||""));this.server.to("conversation:"+m.conversationId).emit("message:updated",m);return m}
 @SubscribeMessage("message:delete")delete(@MessageBody()b:any,@ConnectedSocket()s:Socket){const m=this.store.remove(s.data.userId,String(b.id));this.server.to("conversation:"+m.conversationId).emit("message:updated",m);return m}
 @SubscribeMessage("message:react")react(@MessageBody()b:any,@ConnectedSocket()s:Socket){const m=this.store.react(s.data.userId,String(b.id),String(b.emoji||"👍"));this.server.to("conversation:"+m.conversationId).emit("message:updated",m);return m}
 @SubscribeMessage("message:pin")pin(@MessageBody()b:any,@ConnectedSocket()s:Socket){const id=this.store.pin(s.data.userId,String(b.conversationId),b.messageId?String(b.messageId):null);this.server.to("conversation:"+String(b.conversationId)).emit("message:pinned",{conversationId:String(b.conversationId),messageId:id});return{id}}
 @SubscribeMessage("message:forward")forward(@MessageBody()b:any,@ConnectedSocket()s:Socket){
  const sourceId=String(b.messageId||"");
  const targetCid=String(b.targetConversationId||"");
  if(!this.store.member(targetCid,s.data.userId))throw new ForbiddenException();
  const original=this.store.messageById(sourceId);
  if(!original)throw new BadRequestException("پیام پیدا نشد");
  if(!this.store.member(original.conversationId,s.data.userId))throw new ForbiddenException();
  const m=this.store.addMessage(s.data.userId,targetCid,original.content,original.attachment,undefined);
  this.server.to("conversation:"+targetCid).emit("message:new",m);
  return m;
 }
 emitContactAdded(uid:string,u:PublicUser){this.server.to("user:"+uid).emit("contact:added",u)}
}

@Controller()
class ApiController{
 constructor(private store:Store,private auth:AuthService,private jwt:JwtService,private gateway:ChatGateway){}
 private async uid(req:any){const h=String(req.headers.authorization||"");if(!h.startsWith("Bearer "))throw new UnauthorizedException();try{return(await this.jwt.verifyAsync(h.slice(7)) as any).sub}catch{throw new UnauthorizedException()}}
 @Post("auth/login")async login(@Body()b:any){return this.auth.login(b.username,b.password)}
 @Post("auth/register")async register(@Body()b:any){return this.auth.register(b.username,b.password,b.displayName)}
 @Get("users/me")async me(@Req()r:any){const u=this.store.getUser(await this.uid(r));if(!u)throw new UnauthorizedException();return this.store.publicUser(u)}
 @Get("users/contacts")async contacts(@Req()r:any){return this.store.contacts(await this.uid(r))}
 @Put("users/me/keys")async setKey(@Req()r:any,@Body()b:any){const uid=await this.uid(r);const key=String(b.publicKey||"");if(!key||key.length>500)throw new BadRequestException("کلید عمومی نامعتبر است");return this.store.setPublicKey(uid,key)}
 @Post("users/contacts")async addContact(@Req()r:any,@Body()b:any){const uid=await this.uid(r);const u=this.store.addContact(uid,String(b.username||""));this.gateway.emitContactAdded(uid,u);return u}
 @Get("conversations")async conversations(@Req()r:any){return{items:this.store.conversations(await this.uid(r))}}
 @Post("conversations")async conversation(@Req()r:any,@Body()b:any){const c=this.store.createConversation(await this.uid(r),String(b.userId||""));return c}
 @Get("messages")async messages(@Req()r:any,@Param()p:any){const uid=await this.uid(r);const cid=String(r.query.conversationId||"");if(!this.store.member(cid,uid))throw new ForbiddenException();return{items:this.store.messages(cid),pinned:this.store.pinnedMessage(cid)}}
 @Post("uploads")@UseInterceptors(FileInterceptor("file",{dest:join(process.cwd(),"uploads")}))async upload(@Req()r:any,@UploadedFile()file:any){await this.uid(r);if(!file)throw new BadRequestException("فایلی ارسال نشده است");const safe=String(file.originalname||"file").replace(/[^a-zA-Z0-9._-]/g,"_");const fs=require("fs");const ext=safe.includes(".")?safe.slice(safe.lastIndexOf(".")):"";const target=join(process.cwd(),"uploads",`${file.filename}${ext}`);fs.renameSync(file.path,target);return{attachment:{url:`/uploads/${file.filename}${ext}`,name:file.originalname||safe,mime:file.mimetype||"application/octet-stream",size:file.size||0}}}
}

@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET||"chatapp-local-secret"})],controllers:[ApiController],providers:[Store,AuthService,JwtGuard,ChatGateway]})
export class AppModule{}
