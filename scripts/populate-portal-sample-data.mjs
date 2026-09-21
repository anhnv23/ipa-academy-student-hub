import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase secrets");
if (process.env.CONFIRM_PORTAL_SAMPLE !== "CREATE PORTAL SAMPLE")
  throw new Error("Confirmation must be CREATE PORTAL SAMPLE");
const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
async function must(p, label) {
  const r = await p;
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
  return r.data;
}
const profiles = await must(
  db.from("profiles").select("id,username,full_name,role,student_code"),
  "profiles",
);
const classes = await must(
  db.from("classes").select("id,code,name,total_sessions"),
  "classes",
);
const teachers = Object.fromEntries(
  profiles.filter((x) => x.role === "teacher").map((x) => [x.username, x]),
);
const students = profiles
  .filter((x) => x.role === "student")
  .sort((a, b) => a.username.localeCompare(b.username));
const byCode = Object.fromEntries(classes.map((x) => [x.code, x]));
for (const code of ["I67-A", "J4-B", "COM-A"])
  if (!byCode[code]) throw new Error(`Missing class ${code}`);
for (const user of ["teacher01", "teacher02"])
  if (!teachers[user]) throw new Error(`Missing ${user}`);
const clear = [
  ["teacher_reminders", "id"],
  ["submissions", "id"],
  ["assignment_targets", "assignment_id"],
  ["attendance", "session_id"],
  ["leave_requests", "id"],
  ["assignments", "id"],
  ["tuition_records", "id"],
  ["class_members", "class_id"],
];
for (const [t, c] of clear)
  await must(db.from(t).delete().not(c, "is", null), `clear ${t}`);
await must(
  db
    .from("classes")
    .update({
      teacher_id: teachers.teacher01.id,
      teacher_name: teachers.teacher01.full_name,
    })
    .in("code", ["I67-A", "COM-A"]),
  "assign teacher01",
);
await must(
  db
    .from("classes")
    .update({
      teacher_id: teachers.teacher02.id,
      teacher_name: teachers.teacher02.full_name,
    })
    .eq("code", "J4-B"),
  "assign teacher02",
);
const groups = {
  "I67-A": students.slice(0, 5),
  "J4-B": students.slice(5, 10),
  "COM-A": students.slice(10, 15),
};
const memberRows = Object.entries(groups).flatMap(([code, list]) =>
  list.map((s) => ({ class_id: byCode[code].id, student_id: s.id })),
);
await must(db.from("class_members").insert(memberRows), "class members");
const allSessions = await must(
  db
    .from("class_sessions")
    .select("id,class_id,session_no,session_date")
    .order("session_no"),
  "sessions",
);
const assignmentRows = [];
for (const [code, list] of Object.entries(groups)) {
  const c = byCode[code],
    teacher = code === "J4-B" ? teachers.teacher02 : teachers.teacher01;
  assignmentRows.push(
    {
      class_id: c.id,
      target_student_id: null,
      title: `${code} • Bài luyện tập tổng hợp 01`,
      instructions: `Hoàn thành bài luyện tập theo nội dung buổi học của lớp ${code}. Có thể nộp bằng text hoặc link.`,
      due_at: "2026-10-05T16:00:00+07:00",
      content_type: "mixed",
      resource_link: "https://www.britishcouncil.org/english",
      media_urls: [],
      created_by: teacher.id,
      status: "open",
      sample_key: `${code}-class`,
    },
    {
      class_id: c.id,
      target_student_id: list[0].id,
      title: `${code} • Bài cá nhân — Speaking reflection`,
      instructions: "Ghi lại phần trình bày 2–3 phút và nộp link hoặc video.",
      due_at: "2026-10-08T16:00:00+07:00",
      content_type: "media",
      resource_link: null,
      media_urls: [],
      created_by: teacher.id,
      status: "open",
      sample_key: `${code}-individual`,
    },
  );
}
for (const a of assignmentRows) {
  const { sample_key, ...row } = a;
  const created = await must(
    db.from("assignments").insert(row).select("id,class_id,title").single(),
    `assignment ${sample_key}`,
  );
  a.id = created.id;
}
const targets = [];
for (const [code, list] of Object.entries(groups)) {
  const a = assignmentRows.find((x) => x.sample_key === `${code}-individual`);
  targets.push({ assignment_id: a.id, student_id: list[0].id });
}
await must(db.from("assignment_targets").insert(targets), "assignment targets");
const submissions = [];
for (const [code, list] of Object.entries(groups)) {
  const a = assignmentRows.find((x) => x.sample_key === `${code}-class`);
  list.forEach((s, i) =>
    submissions.push({
      assignment_id: a.id,
      student_id: s.id,
      content: `Bài làm mẫu duy nhất của ${s.full_name} cho lớp ${code}.`,
      submission_link:
        i % 2
          ? `https://example.com/${s.username}-${code.toLowerCase()}`
          : null,
      media_urls: [],
      score: Number((6.8 + (i % 5) * 0.45).toFixed(1)),
      teacher_comment:
        i % 2
          ? "Nội dung tốt, cần cải thiện độ chính xác và phát âm."
          : "Bố cục rõ ràng, tiếp tục phát huy.",
      status: "graded",
      submitted_at: new Date(Date.UTC(2026, 8, 24 + i, 8, 0)).toISOString(),
    }),
  );
  const individual = assignmentRows.find(
    (x) => x.sample_key === `${code}-individual`,
  );
  submissions.push({
    assignment_id: individual.id,
    student_id: list[0].id,
    content: "Bài speaking reflection cá nhân.",
    submission_link: `https://example.com/${list[0].username}-speaking`,
    media_urls: [],
    score: 8.4,
    teacher_comment: "Phản xạ tốt, chú ý ngữ điệu ở phần kết.",
    status: "graded",
    submitted_at: "2026-09-28T08:00:00Z",
  });
}
await must(db.from("submissions").insert(submissions), "submissions");
const attendance = [];
for (const [code, list] of Object.entries(groups)) {
  const ss = allSessions
    .filter((x) => x.class_id === byCode[code].id)
    .slice(0, 6);
  ss.forEach((session, si) =>
    list.forEach((student, pi) =>
      attendance.push({
        session_id: session.id,
        student_id: student.id,
        status:
          (pi + si) % 11 === 0
            ? "excused"
            : (pi + si) % 7 === 0
              ? "unexcused"
              : "present",
        marked_by:
          code === "J4-B" ? teachers.teacher02.id : teachers.teacher01.id,
        note: "Dữ liệu mẫu thống nhất",
      }),
    ),
  );
}
await must(db.from("attendance").insert(attendance), "attendance");
const tuition = [];
for (const [code, list] of Object.entries(groups))
  list.forEach((s, i) => {
    const amount =
        code === "I67-A" ? 18000000 : code === "J4-B" ? 12500000 : 9500000,
      paid = i < 3 ? amount : i === 3 ? amount / 2 : 0;
    tuition.push({
      student_id: s.id,
      class_id: byCode[code].id,
      amount,
      paid_amount: paid,
      due_date: "2026-10-01",
      paid_at: paid === amount ? "2026-09-15T08:00:00Z" : null,
      status: paid === amount ? "paid" : paid ? "partial" : "pending",
      note: "Học phí mẫu cho portal",
    });
  });
await must(db.from("tuition_records").insert(tuition), "tuition");
for (const [code] of Object.entries(groups)) {
  const ss = allSessions
      .filter((x) => x.class_id === byCode[code].id)
      .slice(0, 6),
    att = attendance.filter((x) => ss.some((s) => s.id === x.session_id)),
    rate = Math.round(
      (att.filter((x) => x.status === "present").length / att.length) * 100,
    );
  await must(
    db
      .from("classes")
      .update({ completed_sessions: ss.length, attendance_rate: rate })
      .eq("id", byCode[code].id),
    `class stats ${code}`,
  );
}
console.log(
  "Portal sample ready: 3 assigned classes, 15 students, attendance, tuition, assignments, submissions, scores and comments.",
);
