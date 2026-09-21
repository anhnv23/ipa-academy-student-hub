"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  Link2,
  MessageSquare,
  Plus,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "../lib/supabase";

type ClassRow = {
  id: string;
  code: string;
  name: string;
  room?: string;
  total_sessions: number;
  completed_sessions: number;
  start_time?: string;
  end_time?: string;
  schedule_text?: string;
  teacher_name?: string;
};
type Person = {
  id: string;
  full_name: string;
  student_code?: string;
  username: string;
};
type Session = {
  id: string;
  class_id: string;
  session_no: number;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
};
type Assignment = {
  id: string;
  class_id: string;
  title: string;
  instructions?: string;
  due_at?: string;
  content_type: string;
  resource_link?: string;
  media_urls?: string[];
  status: string;
  created_at: string;
};
type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content?: string;
  submission_link?: string;
  media_urls?: string[];
  score?: number | null;
  teacher_comment?: string;
  status: string;
  submitted_at: string;
};
const date = (v?: string) =>
  v
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(v))
    : "—";
const money = (v: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(v);

function useTeacherData() {
  const [teacherId, setTeacherId] = useState(""),
    [classes, setClasses] = useState<ClassRow[]>([]),
    [students, setStudents] = useState<Person[]>([]),
    [members, setMembers] = useState<
      { class_id: string; student_id: string }[]
    >([]),
    [sessions, setSessions] = useState<Session[]>([]),
    [assignments, setAssignments] = useState<Assignment[]>([]),
    [submissions, setSubmissions] = useState<Submission[]>([]),
    [attendance, setAttendance] = useState<
      { session_id: string; student_id: string; status: string }[]
    >([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Phiên đăng nhập đã hết hạn.");
      setLoading(false);
      return;
    }
    setTeacherId(user.id);
    const c = await supabase
      .from("classes")
      .select(
        "id,code,name,room,total_sessions,completed_sessions,start_time,end_time,schedule_text,teacher_name",
      )
      .eq("teacher_id", user.id)
      .order("code");
    if (c.error) {
      setError(c.error.message);
      setLoading(false);
      return;
    }
    const cls = (c.data || []) as ClassRow[],
      ids = cls.map((x) => x.id);
    setClasses(cls);
    if (!ids.length) {
      setStudents([]);
      setMembers([]);
      setSessions([]);
      setAssignments([]);
      setSubmissions([]);
      setAttendance([]);
      setLoading(false);
      return;
    }
    const [m, s, a] = await Promise.all([
      supabase
        .from("class_members")
        .select("class_id,student_id")
        .in("class_id", ids),
      supabase
        .from("class_sessions")
        .select(
          "id,class_id,session_no,session_date,start_time,end_time,status",
        )
        .in("class_id", ids)
        .order("session_date"),
      supabase
        .from("assignments")
        .select(
          "id,class_id,title,instructions,due_at,content_type,resource_link,media_urls,status,created_at",
        )
        .in("class_id", ids)
        .order("created_at", { ascending: false }),
    ]);
    const studentIds = [...new Set((m.data || []).map((x) => x.student_id))],
      assignmentIds = (a.data || []).map((x) => x.id),
      sessionIds = (s.data || []).map((x) => x.id);
    const [p, sub, att] = await Promise.all([
      studentIds.length
        ? supabase
            .from("profiles")
            .select("id,full_name,student_code,username")
            .in("id", studentIds)
        : Promise.resolve({ data: [], error: null }),
      assignmentIds.length
        ? supabase
            .from("submissions")
            .select(
              "id,assignment_id,student_id,content,submission_link,media_urls,score,teacher_comment,status,submitted_at",
            )
            .in("assignment_id", assignmentIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? supabase
            .from("attendance")
            .select("session_id,student_id,status")
            .in("session_id", sessionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const e =
      m.error || s.error || a.error || p.error || sub.error || att.error;
    if (e) setError(e.message);
    setClasses(cls);
    setMembers(m.data || []);
    setSessions((s.data || []) as Session[]);
    setAssignments((a.data || []) as Assignment[]);
    setStudents((p.data || []) as Person[]);
    setSubmissions((sub.data || []) as Submission[]);
    setAttendance(att.data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return {
    teacherId,
    classes,
    students,
    members,
    sessions,
    assignments,
    submissions,
    attendance,
    loading,
    error,
    load,
  };
}

export function TeacherClassesLive() {
  const d = useTeacherData(),
    [opened, setOpened] = useState<string | null>(null);
  if (d.loading)
    return <section className="panel">Đang tải lớp được phân công…</section>;
  return (
    <>
      <div className="section-head">
        <div>
          <h2>Lớp được phân công</h2>
          <p>Dữ liệu trực tiếp từ phân công của Admin.</p>
        </div>
      </div>
      {d.error && <p className="live-error">{d.error}</p>}{" "}
      {!d.classes.length ? (
        <section className="panel">Bạn chưa được Admin phân công lớp.</section>
      ) : (
        <div className="feature-cards">
          {d.classes.map((c) => {
            const roster = d.students.filter((s) =>
                d.members.some(
                  (m) => m.class_id === c.id && m.student_id === s.id,
                ),
              ),
              upcoming = d.sessions
                .filter(
                  (s) =>
                    s.class_id === c.id &&
                    s.session_date >= new Date().toISOString().slice(0, 10),
                )
                .slice(0, 6);
            return (
              <article className="feature-card" key={c.id}>
                <span className="code-pill">{c.code}</span>
                <h3>{c.name}</h3>
                <p>
                  {roster.length} học viên •{" "}
                  {c.schedule_text ||
                    `${c.start_time?.slice(0, 5)}–${c.end_time?.slice(0, 5)}`}
                </p>
                <div>
                  <button
                    className="secondary"
                    onClick={() =>
                      setOpened(
                        opened === `${c.id}-students`
                          ? null
                          : `${c.id}-students`,
                      )
                    }
                  >
                    Danh sách lớp
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      setOpened(
                        opened === `${c.id}-schedule`
                          ? null
                          : `${c.id}-schedule`,
                      )
                    }
                  >
                    Lịch học
                  </button>
                </div>
                {opened === `${c.id}-students` && (
                  <div className="portal-expand">
                    {roster.map((s) => (
                      <span key={s.id}>
                        <b>{s.full_name}</b>
                        <small>{s.student_code || s.username}</small>
                      </span>
                    ))}
                  </div>
                )}
                {opened === `${c.id}-schedule` && (
                  <div className="portal-expand">
                    {upcoming.map((s) => (
                      <span key={s.id}>
                        <b>
                          Buổi {s.session_no} • {date(s.session_date)}
                        </b>
                        <small>
                          {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}{" "}
                          • {c.room || "Chưa xếp phòng"}
                        </small>
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export function TeacherAttendanceLive() {
  const d = useTeacherData(),
    [classId, setClassId] = useState(""),
    [sessionId, setSessionId] = useState(""),
    [marks, setMarks] = useState<Record<string, string>>({}),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!classId && d.classes[0]) setClassId(d.classes[0].id);
  }, [d.classes, classId]);
  const sessions = d.sessions.filter((s) => s.class_id === classId),
    roster = d.students.filter((s) =>
      d.members.some((m) => m.class_id === classId && m.student_id === s.id),
    );
  useEffect(() => {
    if (sessions[0] && !sessions.some((s) => s.id === sessionId))
      setSessionId(sessions[0].id);
  }, [sessions, sessionId]);
  useEffect(() => {
    setMarks(
      Object.fromEntries(
        d.attendance
          .filter((a) => a.session_id === sessionId)
          .map((a) => [a.student_id, a.status]),
      ),
    );
  }, [sessionId, d.attendance]);
  async function save() {
    if (!supabase || !sessionId) return;
    const rows = roster
      .filter((s) => marks[s.id])
      .map((s) => ({
        session_id: sessionId,
        student_id: s.id,
        status: marks[s.id],
        marked_by: d.teacherId,
      }));
    const { error } = rows.length
      ? await supabase
          .from("attendance")
          .upsert(rows, { onConflict: "session_id,student_id" })
      : { error: null };
    setMessage(error ? error.message : "Đã lưu điểm danh vào Supabase.");
    if (!error) await d.load();
  }
  return (
    <>
      <div className="section-head">
        <div>
          <h2>Điểm danh lớp</h2>
          <p>Chọn lớp và buổi học được phân công.</p>
        </div>
        <button className="primary" disabled={!sessionId} onClick={save}>
          Lưu điểm danh
        </button>
      </div>
      <div className="portal-filters">
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          {d.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} • {c.name}
            </option>
          ))}
        </select>
        <select
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              Buổi {s.session_no} • {date(s.session_date)}
            </option>
          ))}
        </select>
      </div>
      <section className="panel attendance-list">
        {roster.map((p) => (
          <article key={p.id}>
            <span>
              <b>{p.full_name}</b>
              <small>{p.student_code || p.username}</small>
            </span>
            <div>
              {[
                ["present", "Có mặt"],
                ["excused", "Vắng phép"],
                ["unexcused", "Vắng"],
              ].map((x) => (
                <button
                  key={x[0]}
                  className={marks[p.id] === x[0] ? "selected" : ""}
                  onClick={() => setMarks({ ...marks, [p.id]: x[0] })}
                >
                  {x[1]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>
      {message && <p className="auto-note">{message}</p>}
    </>
  );
}

export function TeacherAssignmentsLive({
  grading = false,
}: {
  grading?: boolean;
}) {
  const d = useTeacherData();
  return grading ? <GradingLive data={d} /> : <AssignmentLive data={d} />;
}
function AssignmentLive({
  data: d,
}: {
  data: ReturnType<typeof useTeacherData>;
}) {
  const [classId, setClassId] = useState(""),
    [studentId, setStudentId] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!classId && d.classes[0]) setClassId(d.classes[0].id);
  }, [d.classes, classId]);
  const roster = d.students.filter((s) =>
    d.members.some((m) => m.class_id === classId && m.student_id === s.id),
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !classId) return;
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget),
      file = f.get("media") as File;
    let media_urls: string[] = [];
    if (file?.size) {
      const path = `${d.teacherId}/${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage
        .from("assignment-media")
        .upload(path, file);
      if (up.error) {
        setMessage(up.error.message);
        setBusy(false);
        return;
      }
      media_urls = [path];
    }
    const { data: a, error } = await supabase
      .from("assignments")
      .insert({
        class_id: classId,
        target_student_id: studentId || null,
        title: f.get("title"),
        instructions: f.get("instructions"),
        due_at: f.get("due_at") || null,
        content_type: "mixed",
        resource_link: f.get("resource_link") || null,
        media_urls,
        created_by: d.teacherId,
        status: "open",
      })
      .select("id")
      .single();
    if (!error && a && studentId)
      await supabase
        .from("assignment_targets")
        .insert({ assignment_id: a.id, student_id: studentId });
    setMessage(error ? error.message : "Đã giao bài tập và lưu vào Supabase.");
    setBusy(false);
    if (!error) {
      e.currentTarget.reset();
      setStudentId("");
      await d.load();
    }
  }
  return (
    <>
      <div className="section-head">
        <div>
          <h2>Giao bài tập</h2>
          <p>Giao cho cả lớp hoặc riêng một học viên.</p>
        </div>
      </div>
      <form className="panel assignment-builder" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Lớp
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {d.classes.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.code} • {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Đối tượng
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">Cả lớp</option>
              {roster.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Tên bài tập
            <input name="title" required />
          </label>
          <label>
            Hạn nộp
            <input name="due_at" type="datetime-local" />
          </label>
          <label className="full">
            Nội dung
            <textarea name="instructions" rows={4} />
          </label>
          <label className="full">
            Link tài liệu
            <input name="resource_link" type="url" placeholder="https://..." />
          </label>
          <label className="full upload-inline">
            <Upload /> Đính kèm ảnh/video
            <input name="media" type="file" accept="image/*,video/*" />
          </label>
        </div>
        <button className="primary" disabled={busy || !classId}>
          {busy ? "Đang giao bài…" : "Giao bài tập"}
        </button>
        {message && <p className="auto-note">{message}</p>}
      </form>
      <section className="panel">
        <h3>Bài tập đang theo dõi</h3>
        {d.assignments.map((a) => (
          <div className="simple-line" key={a.id}>
            <span>
              <b>{a.title}</b>
              <small>
                {d.classes.find((c) => c.id === a.class_id)?.code} • Hạn{" "}
                {date(a.due_at)}
              </small>
            </span>
            <span>
              {d.submissions.filter((s) => s.assignment_id === a.id).length} bài
              đã nộp
            </span>
            <mark>{a.status === "open" ? "Đang mở" : a.status}</mark>
          </div>
        ))}
      </section>
    </>
  );
}

function GradingLive({ data: d }: { data: ReturnType<typeof useTeacherData> }) {
  const [classId, setClassId] = useState(""),
    [studentId, setStudentId] = useState(""),
    [edit, setEdit] = useState<
      Record<string, { score: string; comment: string }>
    >({}),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!classId && d.classes[0]) setClassId(d.classes[0].id);
  }, [d.classes, classId]);
  useEffect(() => setStudentId(""), [classId]);
  const roster = d.students.filter((student) =>
      d.members.some(
        (member) =>
          member.class_id === classId && member.student_id === student.id,
      ),
    ),
    classAssignments = d.assignments.filter(
      (assignment) => assignment.class_id === classId,
    ),
    studentSubmissions = d.submissions.filter(
      (submission) =>
        submission.student_id === studentId &&
        classAssignments.some(
          (assignment) => assignment.id === submission.assignment_id,
        ),
    );
  async function save(s: Submission) {
    if (!supabase) return;
    const v = edit[s.id] || {
      score: String(s.score ?? ""),
      comment: s.teacher_comment || "",
    };
    const { error } = await supabase
      .from("submissions")
      .update({
        score: v.score ? Number(v.score) : null,
        teacher_comment: v.comment,
        status: "graded",
      })
      .eq("id", s.id);
    setMessage(error ? error.message : "Đã lưu điểm và nhận xét.");
    if (!error) await d.load();
  }
  async function remind(s: Submission) {
    if (!supabase) return;
    const { error } = await supabase.from("teacher_reminders").insert({
      teacher_id: d.teacherId,
      student_id: s.student_id,
      assignment_id: s.assignment_id,
      message: "Giáo viên nhắc bạn xem lại và hoàn thiện bài tập.",
    });
    setMessage(error ? error.message : "Đã gửi nhắc nhở riêng.");
  }
  async function openMedia(path: string) {
    if (!supabase) return;
    const { data, error } = await supabase.storage
      .from("assignment-media")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Không mở được media.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  return (
    <>
      <div className="section-head">
        <div>
          <h2>Chấm bài và phản hồi</h2>
          <p>Chọn lớp, chọn học viên rồi chấm từng bài đã nộp.</p>
        </div>
      </div>
      {message && <p className="auto-note">{message}</p>}
      <section className="grading-class-picker">
        {d.classes.map((classRow) => (
          <button
            key={classRow.id}
            className={classId === classRow.id ? "active" : ""}
            onClick={() => setClassId(classRow.id)}
          >
            <span>{classRow.code}</span>
            <b>{classRow.name}</b>
            <small>
              {
                d.members.filter((member) => member.class_id === classRow.id)
                  .length
              }{" "}
              học viên
            </small>
          </button>
        ))}
      </section>
      <section className="panel grading-student-picker">
        <h3>Danh sách học viên</h3>
        <div>
          {roster.map((student) => {
            const submitted = d.submissions.filter(
              (submission) =>
                submission.student_id === student.id &&
                classAssignments.some(
                  (assignment) => assignment.id === submission.assignment_id,
                ),
            ).length;
            return (
              <button
                key={student.id}
                className={studentId === student.id ? "active" : ""}
                onClick={() => setStudentId(student.id)}
              >
                <b>{student.full_name}</b>
                <small>{student.student_code || student.username}</small>
                <mark>{submitted} bài đã nộp</mark>
              </button>
            );
          })}
        </div>
      </section>
      {studentId && (
        <section className="grading-submission-list">
          <h3>
            Bài nộp của{" "}
            {d.students.find((student) => student.id === studentId)?.full_name}
          </h3>
          {studentSubmissions.length ? (
            studentSubmissions.map((submission) => {
              const assignment = d.assignments.find(
                  (item) => item.id === submission.assignment_id,
                ),
                value = edit[submission.id] || {
                  score: String(submission.score ?? ""),
                  comment: submission.teacher_comment || "",
                };
              return (
                <article
                  className="panel grading-submission-card"
                  key={submission.id}
                >
                  <header>
                    <div>
                      <span>
                        {d.classes.find((item) => item.id === classId)?.code}
                      </span>
                      <h3>{assignment?.title}</h3>
                      <small>Nộp ngày {date(submission.submitted_at)}</small>
                    </div>
                    <mark>
                      {submission.status === "graded" ? "Đã chấm" : "Chờ chấm"}
                    </mark>
                  </header>
                  <div className="submitted-content">
                    <h4>Yêu cầu bài tập</h4>
                    <p>{assignment?.instructions || "Không có hướng dẫn."}</p>
                    <h4>Nội dung học viên nộp</h4>
                    <p>{submission.content || "Không có nội dung text."}</p>
                    {submission.submission_link && (
                      <a
                        href={submission.submission_link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Link2 /> Mở link bài nộp
                      </a>
                    )}
                    {(submission.media_urls || []).map((path) => (
                      <button
                        className="secondary"
                        key={path}
                        onClick={() => openMedia(path)}
                      >
                        <Upload /> Mở ảnh/video đính kèm
                      </button>
                    ))}
                  </div>
                  <div className="grading-fields">
                    <label>
                      Điểm
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={value.score}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            [submission.id]: {
                              ...value,
                              score: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                    <label>
                      Nhận xét
                      <textarea
                        rows={4}
                        value={value.comment}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            [submission.id]: {
                              ...value,
                              comment: e.target.value,
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <footer>
                    <button
                      className="secondary"
                      onClick={() => remind(submission)}
                    >
                      <MessageSquare /> Nhắc riêng
                    </button>
                    <button
                      className="primary"
                      onClick={() => save(submission)}
                    >
                      Lưu điểm và nhận xét
                    </button>
                  </footer>
                </article>
              );
            })
          ) : (
            <section className="panel">
              Học viên chưa có bài nộp trong lớp này.
            </section>
          )}
        </section>
      )}
    </>
  );
}

export function TeacherReportsLive() {
  const d = useTeacherData(),
    [classId, setClassId] = useState(""),
    [studentId, setStudentId] = useState("");
  useEffect(() => {
    if (!classId && d.classes[0]) setClassId(d.classes[0].id);
  }, [d.classes, classId]);
  const roster = d.students.filter((s) =>
    d.members.some((m) => m.class_id === classId && m.student_id === s.id),
  );
  useEffect(() => {
    if (roster[0] && !roster.some((s) => s.id === studentId))
      setStudentId(roster[0].id);
  }, [classId, roster, studentId]);
  const classSessions = d.sessions.filter((s) => s.class_id === classId),
    classAssignments = d.assignments.filter((a) => a.class_id === classId);
  const metrics = roster.map((p) => {
    const att = d.attendance.filter(
        (a) =>
          a.student_id === p.id &&
          classSessions.some((s) => s.id === a.session_id),
      ),
      sub = d.submissions.filter(
        (s) =>
          s.student_id === p.id &&
          classAssignments.some((a) => a.id === s.assignment_id),
      ),
      scores = sub.filter((s) => s.score != null).map((s) => Number(s.score));
    return {
      ...p,
      attendance: att.length
        ? Math.round(
            (att.filter((a) => a.status === "present").length / att.length) *
              100,
          )
        : 0,
      completion: classAssignments.length
        ? Math.round((sub.length / classAssignments.length) * 100)
        : 0,
      average: scores.length
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : 0,
    };
  });
  const chosen = metrics.find((x) => x.id === studentId),
    chart = d.submissions
      .filter((s) => s.student_id === studentId && s.score != null)
      .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
      .map((s, i) => ({
        name: `Bài ${i + 1}`,
        score: Number(s.score),
        title: d.assignments.find((a) => a.id === s.assignment_id)?.title,
      }));
  const classChart = metrics.map((x) => ({
    name: x.full_name.split(" ").at(-1),
    score: x.average,
    attendance: x.attendance,
  }));
  return (
    <>
      <div className="section-head">
        <div>
          <h2>Báo cáo lớp và học viên</h2>
          <p>Biểu đồ tổng hợp từ điểm danh, bài tập và điểm số thực tế.</p>
        </div>
      </div>
      <div className="portal-filters">
        <select value={classId} onChange={(e) => setClassId(e.target.value)}>
          {d.classes.map((c) => (
            <option value={c.id} key={c.id}>
              {c.code} • {c.name}
            </option>
          ))}
        </select>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          {roster.map((s) => (
            <option value={s.id} key={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>
      <section className="report-charts">
        <article className="panel">
          <h3>Tổng quan lớp</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={classChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="attendance"
                name="Chuyên cần %"
                stroke="#0c62c7"
              />
              <Line
                type="monotone"
                dataKey="score"
                name="Điểm TB"
                stroke="#18a47a"
              />
            </LineChart>
          </ResponsiveContainer>
        </article>
        <article className="panel">
          <h3>Tiến bộ của {chosen?.full_name || "học viên"}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="score"
                name="Điểm"
                stroke="#8b5cf6"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </article>
      </section>
      <section className="panel data-list">
        <div className="data-row data-head">
          <span>Học viên</span>
          <span>Chuyên cần</span>
          <span>Hoàn thành bài</span>
          <span>Điểm TB</span>
          <span>Xu hướng</span>
        </div>
        {metrics.map((p) => (
          <div className="data-row" key={p.id}>
            <span>
              <b>{p.full_name}</b>
              <small>{p.student_code}</small>
            </span>
            <span>{p.attendance}%</span>
            <span>{p.completion}%</span>
            <span>{p.average || "—"}</span>
            <span className="trend">
              {p.average >= 7 ? "↗ Tiến bộ" : "→ Cần theo dõi"}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

function useStudentData() {
  const [userId, setUserId] = useState(""),
    [classes, setClasses] = useState<ClassRow[]>([]),
    [sessions, setSessions] = useState<Session[]>([]),
    [assignments, setAssignments] = useState<Assignment[]>([]),
    [submissions, setSubmissions] = useState<Submission[]>([]),
    [tuition, setTuition] = useState<any[]>([]),
    [attendance, setAttendance] = useState<any[]>([]),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const m = await supabase
        .from("class_members")
        .select("class_id")
        .eq("student_id", user.id),
      ids = (m.data || []).map((x) => x.class_id);
    const [c, s, a, sub, t, att] = await Promise.all([
      ids.length
        ? supabase
            .from("classes")
            .select(
              "id,code,name,room,total_sessions,completed_sessions,start_time,end_time,schedule_text,teacher_name",
            )
            .in("id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from("class_sessions")
            .select(
              "id,class_id,session_no,session_date,start_time,end_time,status",
            )
            .in("class_id", ids)
            .order("session_date")
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from("assignments")
            .select(
              "id,class_id,title,instructions,due_at,content_type,resource_link,media_urls,status,created_at",
            )
            .in("class_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase
        .from("submissions")
        .select(
          "id,assignment_id,student_id,content,submission_link,media_urls,score,teacher_comment,status,submitted_at",
        )
        .eq("student_id", user.id),
      supabase
        .from("tuition_records")
        .select("id,class_id,amount,paid_amount,status,due_date,paid_at")
        .eq("student_id", user.id),
      supabase
        .from("attendance")
        .select("session_id,status")
        .eq("student_id", user.id),
    ]);
    setClasses((c.data || []) as ClassRow[]);
    setSessions((s.data || []) as Session[]);
    setAssignments((a.data || []) as Assignment[]);
    setSubmissions((sub.data || []) as Submission[]);
    setTuition(t.data || []);
    setAttendance(att.data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return {
    userId,
    classes,
    sessions,
    assignments,
    submissions,
    tuition,
    attendance,
    loading,
    load,
  };
}

export function StudentAssignmentsLive() {
  const d = useStudentData(),
    [opened, setOpened] = useState<Assignment | null>(null),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !opened) return;
    const f = new FormData(e.currentTarget),
      file = f.get("media") as File;
    let media_urls: string[] = [];
    if (file?.size) {
      const path = `${d.userId}/${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage
        .from("assignment-media")
        .upload(path, file);
      if (up.error) {
        setMessage(up.error.message);
        return;
      }
      media_urls = [path];
    }
    const { error } = await supabase.from("submissions").upsert(
      {
        assignment_id: opened.id,
        student_id: d.userId,
        content: f.get("content") || null,
        submission_link: f.get("link") || null,
        media_urls,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,student_id" },
    );
    setMessage(error ? error.message : "Đã nộp bài thành công.");
    if (!error) {
      setOpened(null);
      await d.load();
    }
  }
  return (
    <>
      <div className="section-head">
        <div>
          <h2>Bài tập của tôi</h2>
          <p>Bài được giao từ các lớp đang học.</p>
        </div>
      </div>
      {message && <p className="auto-note">{message}</p>}
      <section className="panel">
        {d.assignments.map((a) => {
          const s = d.submissions.find((x) => x.assignment_id === a.id);
          return (
            <div className="simple-line" key={a.id}>
              <span>
                <b>{a.title}</b>
                <small>
                  {d.classes.find((c) => c.id === a.class_id)?.code} • Hạn{" "}
                  {date(a.due_at)}
                  {s?.teacher_comment ? ` • GV: ${s.teacher_comment}` : ""}
                </small>
              </span>
              <mark>
                {s
                  ? s.status === "graded"
                    ? `Đã chấm ${s.score ?? ""}`
                    : "Đã nộp"
                  : "Chưa nộp"}
              </mark>
              <button className="primary" onClick={() => setOpened(a)}>
                {s ? "Nộp lại" : "Nộp bài"}
              </button>
            </div>
          );
        })}
      </section>
      {opened && (
        <div className="modal-layer">
          <button className="modal-backdrop" onClick={() => setOpened(null)} />
          <form className="modal" onSubmit={submit}>
            <h2>{opened.title}</h2>
            <p>{opened.instructions}</p>
            <div className="form-grid">
              <label className="full">
                Nội dung
                <textarea name="content" rows={5} />
              </label>
              <label className="full">
                Link bài làm
                <input name="link" type="url" />
              </label>
              <label className="full">
                Ảnh/video
                <input name="media" type="file" accept="image/*,video/*" />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setOpened(null)}
              >
                Hủy
              </button>
              <button className="primary">Nộp bài</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function StudentReportsLive() {
  const d = useStudentData(),
    scores = d.submissions
      .filter((s) => s.score != null)
      .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
      .map((s, i) => ({
        name: `Bài ${i + 1}`,
        score: Number(s.score),
        title: d.assignments.find((a) => a.id === s.assignment_id)?.title,
      })),
    attendance = d.attendance.length
      ? Math.round(
          (d.attendance.filter((a) => a.status === "present").length /
            d.attendance.length) *
            100,
        )
      : 0,
    avg = scores.length
      ? (scores.reduce((n, x) => n + x.score, 0) / scores.length).toFixed(1)
      : "—";
  return (
    <>
      <div className="section-head">
        <div>
          <h2>Báo cáo học tập</h2>
          <p>Dữ liệu điểm số và chuyên cần của bạn.</p>
        </div>
      </div>
      <section className="admin-kpis">
        <article>
          <span>Chuyên cần</span>
          <strong>{attendance}%</strong>
        </article>
        <article>
          <span>Đã nộp</span>
          <strong>
            {d.submissions.length}/{d.assignments.length}
          </strong>
        </article>
        <article>
          <span>Điểm trung bình</span>
          <strong>{avg}</strong>
        </article>
      </section>
      <section className="panel">
        <h3>Biểu đồ tiến bộ</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={scores}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0c62c7"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </section>
    </>
  );
}

export function StudentCourseLive() {
  const d = useStudentData();
  return (
    <>
      <div className="section-head">
        <div>
          <h2>Khóa học của tôi</h2>
          <p>Thông tin, học phí và lịch trình lấy từ Supabase.</p>
        </div>
      </div>
      <section className="course-summary">
        {d.classes.map((c) => {
          const fee = d.tuition.find((t) => t.class_id === c.id);
          return (
            <article key={c.id}>
              <BookOpen />
              <span>
                <small>Khóa học</small>
                <b>
                  {c.name} • {c.code}
                </b>
                <em>
                  {c.completed_sessions}/{c.total_sessions} buổi •{" "}
                  {c.teacher_name || "Chưa phân giáo viên"}
                </em>
                {fee && (
                  <>
                    <small>
                      Học phí: {money(Number(fee.paid_amount || 0))}/
                      {money(Number(fee.amount || 0))}
                    </small>
                    <em>
                      {fee.status === "paid"
                        ? "Đã hoàn thành"
                        : "Còn phải thanh toán"}
                    </em>
                  </>
                )}
              </span>
            </article>
          );
        })}
      </section>
      <section className="panel">
        <h3>Lịch trình sắp tới</h3>
        {d.sessions
          .filter(
            (s) => s.session_date >= new Date().toISOString().slice(0, 10),
          )
          .slice(0, 12)
          .map((s) => (
            <div className="simple-line" key={s.id}>
              <span>
                <b>
                  {d.classes.find((c) => c.id === s.class_id)?.code} •{" "}
                  {date(s.session_date)}
                </b>
                <small>
                  {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                </small>
              </span>
              <mark>{s.status}</mark>
            </div>
          ))}
      </section>
    </>
  );
}
