import {createClient} from "@supabase/supabase-js";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!service)throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
if(process.env.CONFIRM_INITIALIZE!=="CREATE IPA SAMPLE")throw new Error("Confirmation value must be CREATE IPA SAMPLE");
const db=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
const teachers=[
 {username:"teacher01",password:"Teacher@123",full_name:"Nguyễn Mai Anh",phone:"0901000001",secondary_phone:"",birth_date:"1990-04-12",address:"Cầu Giấy, Hà Nội"},
 {username:"teacher02",password:"Teacher@123",full_name:"Trần Đức Long",phone:"0901000002",secondary_phone:"",birth_date:"1988-11-23",address:"Nam Từ Liêm, Hà Nội"}
];
const names=["Nguyễn Minh Anh","Trần Gia Huy","Lê Khánh Linh","Phạm Đức Minh","Vũ Quỳnh Chi","Đỗ Hoàng Nam","Bùi Ngọc Hà","Hoàng Tuấn Kiệt","Nguyễn Bảo An","Trần Khánh Vy","Lê Minh Khang","Phạm Thảo Nguyên","Vũ Đức Anh","Đặng Hải Yến","Ngô Gia Bảo"];
const students=names.map((full_name,i)=>({username:`student${String(i+1).padStart(2,"0")}`,password:"Student@123",full_name,student_code:`IPA-${25001+i}`,phone:`0912${String(100000+i).slice(-6)}`,secondary_phone:`0988${String(200000+i).slice(-6)}`,birth_date:`${2010+i%5}-${String(i%12+1).padStart(2,"0")}-${String(i%24+1).padStart(2,"0")}`,address:`Số ${12+i}, Hà Nội`,parent_name:`Phụ huynh ${full_name}`,parent_phone:`0936${String(300000+i).slice(-6)}`}));
const classes=[
 {code:"I67-A",name:"IELTS 6.5",level:"Intermediate",start_date:"2026-09-22",total_sessions:36,start_time:"18:00",end_time:"19:30",weekdays:[2,4],room:"Ocean",curriculum:"IPA IELTS Core 6.5",expected_outcomes:"Đạt mục tiêu IELTS 6.5",schedule_text:"T3, T5 • 18:00–19:30"},
 {code:"J4-B",name:"Junior 4",level:"A2–B1",start_date:"2026-09-23",total_sessions:32,start_time:"17:30",end_time:"19:00",weekdays:[3,6],room:"Sky",curriculum:"IPA Junior 4",expected_outcomes:"Hoàn thành năng lực A2–B1",schedule_text:"T4, T7 • 17:30–19:00"},
 {code:"COM-A",name:"Communication",level:"Pre-intermediate",start_date:"2026-09-21",total_sessions:30,start_time:"19:30",end_time:"21:00",weekdays:[1,5],room:"River",curriculum:"IPA Communication",expected_outcomes:"Giao tiếp tự tin trong tình huống thông dụng",schedule_text:"T2, T6 • 19:30–21:00"}
];
function sessionsFor(c){const out=[],d=new Date(`${c.start_date}T12:00:00Z`);while(out.length<c.total_sessions){if(c.weekdays.includes(d.getUTCDay()))out.push({session_no:out.length+1,session_date:d.toISOString().slice(0,10),start_time:c.start_time,end_time:c.end_time,status:"scheduled"});d.setUTCDate(d.getUTCDate()+1)}return out}
async function must(p,label){const r=await p;if(r.error)throw new Error(`${label}: ${r.error.message}`);return r.data}
const adminProfiles=await must(db.from("profiles").select("id").eq("role","admin"),"Read admin");const adminIds=new Set((adminProfiles||[]).map(x=>x.id));
for(const [table,column] of [["teacher_reminders","id"],["submissions","id"],["assignment_targets","assignment_id"],["attendance","session_id"],["leave_requests","id"],["assignments","id"],["tuition_records","id"],["class_members","class_id"],["class_sessions","id"],["class_weekly_rules","id"],["classes","id"]])await must(db.from(table).delete().not(column,"is",null),`Clear ${table}`);
const users=await must(db.auth.admin.listUsers({page:1,perPage:1000}),"List auth users");for(const u of users.users)if(!adminIds.has(u.id))await must(db.auth.admin.deleteUser(u.id),`Delete ${u.email}`);
await must(db.from("profiles").delete().neq("role","admin"),"Clear non-admin profiles");
async function person(p,role){const created=await must(db.auth.admin.createUser({email:`${p.username}@ipa.local`,password:p.password,email_confirm:true,user_metadata:{username:p.username,role,full_name:p.full_name}}),`Create ${p.username}`);const row={id:created.user.id,role,username:p.username,full_name:p.full_name,phone:p.phone||null,secondary_phone:p.secondary_phone||null,birth_date:p.birth_date||null,address:p.address||null,active:true};if(role==="student")Object.assign(row,{student_code:p.student_code,parent_name:p.parent_name,parent_phone:p.parent_phone});await must(db.from("profiles").upsert(row),`Profile ${p.username}`)}
for(const p of teachers)await person(p,"teacher");for(const p of students)await person(p,"student");
for(const c of classes){const row=await must(db.from("classes").insert({...c,completed_sessions:0,attendance_rate:0,status:"active",teacher_id:null,teacher_name:null}).select("id").single(),`Class ${c.code}`);await must(db.from("class_weekly_rules").insert(c.weekdays.map(weekday=>({class_id:row.id,weekday,start_time:c.start_time,end_time:c.end_time}))),`Rules ${c.code}`);await must(db.from("class_sessions").insert(sessionsFor(c).map(s=>({...s,class_id:row.id}))),`Sessions ${c.code}`)}
console.log("Created 3 classes, 15 students and 2 teachers. No class assignments were created.");
