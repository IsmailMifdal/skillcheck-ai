import { mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AnswerPhase, MasteryStatus, SessionPhase } from "@/types";

type Row = Record<string, any>;

let database: any = null;

function getDatabase() {
  if (database) return database;

  const { DatabaseSync } = eval("require")("node:sqlite");
  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });

  database = new DatabaseSync(path.join(dataDir, "skillcheck.sqlite"));
  database.exec("PRAGMA foreign_keys = ON");
  database.exec(`
    create table if not exists documents (
      id text primary key,
      user_id text not null,
      titre text not null,
      contenu text not null,
      embedding text,
      created_at text not null default current_timestamp
    );

    create table if not exists document_chunks (
      id text primary key,
      document_id text not null references documents(id) on delete cascade,
      chunk_index integer not null,
      contenu text not null,
      embedding text,
      created_at text not null default current_timestamp
    );

    create table if not exists concepts (
      id text primary key,
      document_id text not null references documents(id) on delete cascade,
      nom text not null,
      description text,
      ordre integer default 0,
      created_at text not null default current_timestamp
    );

    create table if not exists questions (
      id text primary key,
      concept_id text not null references concepts(id) on delete cascade,
      enonce text not null,
      options text not null,
      reponse_correcte integer not null,
      explication text,
      difficulte integer not null default 1,
      created_at text not null default current_timestamp
    );

    create table if not exists sessions (
      id text primary key,
      user_id text not null,
      document_id text not null references documents(id) on delete cascade,
      phase text not null default 'diagnostic',
      score_avant real,
      score_apres real,
      created_at text not null default current_timestamp
    );

    create table if not exists reponses (
      id text primary key,
      session_id text not null references sessions(id) on delete cascade,
      question_id text not null references questions(id) on delete cascade,
      reponse_donnee integer not null,
      est_correcte integer not null,
      confiance text not null default 'hesitant',
      misconception integer not null default 0,
      phase text not null default 'diagnostic',
      created_at text not null default current_timestamp
    );

    create table if not exists maitrise (
      id text primary key,
      session_id text not null references sessions(id) on delete cascade,
      concept_id text not null references concepts(id) on delete cascade,
      score real not null default 0,
      statut text not null default 'non_teste',
      updated_at text not null default current_timestamp,
      unique (session_id, concept_id)
    );

    create index if not exists idx_documents_user on documents(user_id);
    create index if not exists idx_chunks_document on document_chunks(document_id);
    create index if not exists idx_concepts_document on concepts(document_id);
    create index if not exists idx_questions_concept on questions(concept_id);
    create index if not exists idx_sessions_user on sessions(user_id);
    create index if not exists idx_reponses_session on reponses(session_id);
    create index if not exists idx_maitrise_session on maitrise(session_id);
  `);

  return database;
}

function one<T = Row>(sql: string, ...params: any[]): T | null {
  return getDatabase().prepare(sql).get(...params) ?? null;
}

function all<T = Row>(sql: string, ...params: any[]): T[] {
  return getDatabase().prepare(sql).all(...params) as T[];
}

function run(sql: string, ...params: any[]) {
  return getDatabase().prepare(sql).run(...params);
}

export function createDocument(userId: string, titre: string, contenu: string) {
  const id = randomUUID();
  run(
    "insert into documents (id, user_id, titre, contenu) values (?, ?, ?, ?)",
    id,
    userId,
    titre,
    contenu
  );
  return id;
}

export function deleteDocument(id: string) {
  run("delete from documents where id = ?", id);
}

export function updateDocumentEmbedding(id: string, embedding: unknown) {
  run("update documents set embedding = ? where id = ?", JSON.stringify(embedding), id);
}

export function insertDocumentChunks(
  rows: { document_id: string; chunk_index: number; contenu: string; embedding?: unknown }[]
) {
  const stmt = getDatabase().prepare(
    "insert into document_chunks (id, document_id, chunk_index, contenu, embedding) values (?, ?, ?, ?, ?)"
  );
  for (const row of rows) {
    stmt.run(
      randomUUID(),
      row.document_id,
      row.chunk_index,
      row.contenu,
      JSON.stringify(row.embedding ?? null)
    );
  }
}

export function getDocumentChunks(documentId: string) {
  return all<{ contenu: string; chunk_index: number }>(
    "select contenu, chunk_index from document_chunks where document_id = ? order by chunk_index",
    documentId
  );
}

export function insertConcepts(
  concepts: { document_id: string; nom: string; description: string | null; ordre: number }[]
) {
  const stmt = getDatabase().prepare(
    "insert into concepts (id, document_id, nom, description, ordre) values (?, ?, ?, ?, ?)"
  );
  return concepts.map((concept) => {
    const id = randomUUID();
    stmt.run(id, concept.document_id, concept.nom, concept.description, concept.ordre);
    return { id, ...concept };
  });
}

export function insertQuestions(
  questions: {
    concept_id: string;
    enonce: string;
    options: string[];
    reponse_correcte: number;
    explication: string | null;
    difficulte: number;
  }[]
) {
  const stmt = getDatabase().prepare(
    "insert into questions (id, concept_id, enonce, options, reponse_correcte, explication, difficulte) values (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const q of questions) {
    stmt.run(
      randomUUID(),
      q.concept_id,
      q.enonce,
      JSON.stringify(q.options),
      q.reponse_correcte,
      q.explication,
      q.difficulte
    );
  }
}

export function createSession(userId: string, documentId: string) {
  const id = randomUUID();
  run(
    "insert into sessions (id, user_id, document_id, phase) values (?, ?, ?, 'diagnostic')",
    id,
    userId,
    documentId
  );
  return id;
}

export function insertMasteryRows(
  rows: { session_id: string; concept_id: string; score: number; statut: MasteryStatus | "non_teste" }[]
) {
  const stmt = getDatabase().prepare(
    "insert into maitrise (id, session_id, concept_id, score, statut) values (?, ?, ?, ?, ?)"
  );
  for (const row of rows) {
    stmt.run(randomUUID(), row.session_id, row.concept_id, row.score, row.statut);
  }
}

export function getSession(sessionId: string) {
  return one("select id, user_id, document_id, phase, score_avant, score_apres from sessions where id = ?", sessionId);
}

export function getDashboardSessions(userId: string) {
  return all(
    `select s.id, s.phase, s.score_avant, s.score_apres, s.created_at, d.titre as document_titre
     from sessions s
     join documents d on d.id = s.document_id
     where s.user_id = ?
     order by s.created_at desc
     limit 12`,
    userId
  );
}

export function getSessionPayload(sessionId: string) {
  const session = getSession(sessionId);
  if (!session) return null;
  const document = one("select id, titre from documents where id = ?", session.document_id);
  const concepts = all(
    "select id, document_id, nom, description, ordre from concepts where document_id = ? order by ordre",
    session.document_id
  );
  const mastery = all("select concept_id, score, statut from maitrise where session_id = ?", sessionId);
  const conceptIds = concepts.map((c) => c.id);
  const questions = conceptIds.length
    ? all(
        `select id, concept_id, enonce, options, difficulte
         from questions
         where concept_id in (${conceptIds.map(() => "?").join(",")})`,
        ...conceptIds
      ).map((q) => ({ ...q, options: JSON.parse(q.options) }))
    : [];
  const reponses = all(
    "select question_id, est_correcte, confiance, misconception, phase from reponses where session_id = ?",
    sessionId
  ).map((r) => ({
    ...r,
    est_correcte: Boolean(r.est_correcte),
    misconception: Boolean(r.misconception),
  }));

  return { session, document, concepts, mastery, questions, reponses };
}

export function getQuestion(questionId: string) {
  const question = one<any>("select * from questions where id = ?", questionId);
  return question ? { ...question, options: JSON.parse(question.options) } : null;
}

export function replaceResponse(params: {
  sessionId: string;
  questionId: string;
  reponseDonnee: number;
  estCorrecte: boolean;
  confiance: string;
  misconception: boolean;
  phase: AnswerPhase;
}) {
  run(
    "delete from reponses where session_id = ? and question_id = ? and phase = ?",
    params.sessionId,
    params.questionId,
    params.phase
  );
  run(
    `insert into reponses
      (id, session_id, question_id, reponse_donnee, est_correcte, confiance, misconception, phase)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    params.sessionId,
    params.questionId,
    params.reponseDonnee,
    params.estCorrecte ? 1 : 0,
    params.confiance,
    params.misconception ? 1 : 0,
    params.phase
  );
}

export function getAnswerSignals(sessionId: string, conceptId: string, phase: AnswerPhase) {
  return all(
    `select r.est_correcte, r.confiance, q.difficulte
     from reponses r
     join questions q on q.id = r.question_id
     where r.session_id = ? and r.phase = ? and q.concept_id = ?`,
    sessionId,
    phase,
    conceptId
  ).map((r) => ({
    est_correcte: Boolean(r.est_correcte),
    confiance: r.confiance,
    difficulte: r.difficulte,
  }));
}

export function updateMastery(sessionId: string, conceptId: string, score: number, statut: MasteryStatus) {
  run(
    "update maitrise set score = ?, statut = ?, updated_at = current_timestamp where session_id = ? and concept_id = ?",
    score,
    statut,
    sessionId,
    conceptId
  );
}

export function getMasteryRows(sessionId: string) {
  return all("select score, statut, concept_id from maitrise where session_id = ?", sessionId);
}

export function updateSessionScore(sessionId: string, phase: AnswerPhase, score: number) {
  const column = phase === "diagnostic" ? "score_avant" : "score_apres";
  run(`update sessions set ${column} = ? where id = ?`, score, sessionId);
}

export function updateSessionPhase(sessionId: string, phase: SessionPhase) {
  run("update sessions set phase = ? where id = ?", phase, sessionId);
  return getSession(sessionId);
}

export function getConcept(conceptId: string) {
  return one("select id, nom, description, document_id from concepts where id = ?", conceptId);
}

export function getMasteryStatus(sessionId: string, conceptId: string) {
  return one<{ statut: string }>(
    "select statut from maitrise where session_id = ? and concept_id = ?",
    sessionId,
    conceptId
  );
}
