import {createClient} from "@supabase/supabase-js";

const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});

export default async request=>{
 if(request.method!=="POST")return reply({error:"Method not allowed"},405);
 let createdId=null;
 try{
  const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!service)throw new Error("Thiếu biến môi trường Supabase phía máy chủ.");
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  const{data:{user}}=await admin.auth.getUser(token);
  if(!user)return reply({error:"Phiên đăng nhập Admin không hợp lệ."},401);
  const{data:caller}=await admin.from("profiles").select("role").eq("id",user.id).single();
  if(caller?.role!=="admin")return reply({error:"Chỉ Admin được quản lý tài khoản."},403);

  const body=await request.json();
  const username=String(body.username||"").trim().toLowerCase();
  const password=String(body.password||"");
  const role=String(body.role||"");
  if(!/^[a-z0-9._-]{3,40}$/.test(username))return reply({error:"Username chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang."},400);
  if(!["teacher","student"].includes(role))return reply({error:"Vai trò không hợp lệ."},400);
  if(!body.user_id&&password.length<8)return reply({error:"Tài khoản mới cần mật khẩu ít nhất 8 ký tự."},400);
  if(body.user_id&&password&&password.length<8)return reply({error:"Mật khẩu mới cần ít nhất 8 ký tự."},400);

  const email=`${username}@ipa.local`;
  let targetId=body.user_id?String(body.user_id):null;
  if(targetId){
   const{data:target,error:targetError}=await admin.from("profiles").select("id,role").eq("id",targetId).single();
   if(targetError||!target||target.role==="admin")return reply({error:"Không tìm thấy tài khoản có thể chỉnh sửa."},404);
   const attrs={email,email_confirm:true,user_metadata:{username}};
   if(password)attrs.password=password;
   const{error:updateError}=await admin.auth.admin.updateUserById(targetId,attrs);
   if(updateError)throw updateError;
  }else{
   const{data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username}});
   if(createError)throw createError;
   targetId=created.user.id;createdId=targetId;
  }

  const profile={id:targetId,username,full_name:String(body.full_name||"").trim(),role,phone:body.phone||null,secondary_phone:body.secondary_phone||null,birth_date:body.birth_date||null,address:body.address||null,parent_name:body.parent_name||null,parent_phone:body.parent_phone||null,active:body.active!==false};
  if(!profile.full_name)throw new Error("Họ và tên không được để trống.");
  const{error:profileError}=await admin.from("profiles").upsert(profile,{onConflict:"id"});
  if(profileError)throw profileError;

  if(Array.isArray(body.class_codes)){
   const codes=[...new Set(body.class_codes.map(String).filter(Boolean))];
   const{data:classRows,error:classError}=codes.length?await admin.from("classes").select("id,code").in("code",codes):{data:[],error:null};
   if(classError)throw classError;
   if(role==="student"){
    await admin.from("class_members").delete().eq("student_id",targetId);
    if(classRows.length){const{error}=await admin.from("class_members").insert(classRows.map(c=>({class_id:c.id,student_id:targetId})));if(error)throw error}
   }else{
    await admin.from("classes").update({teacher_id:null}).eq("teacher_id",targetId);
    if(classRows.length){const{error}=await admin.from("classes").update({teacher_id:targetId,teacher_name:profile.full_name}).in("id",classRows.map(c=>c.id));if(error)throw error}
   }
  }
  return reply({user_id:targetId,username,role,updated:Boolean(body.user_id)});
 }catch(error){
  if(createdId){try{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;await createClient(url,service).auth.admin.deleteUser(createdId)}catch{}}
  return reply({error:error?.message||"Không thể lưu tài khoản."},400);
 }
};
