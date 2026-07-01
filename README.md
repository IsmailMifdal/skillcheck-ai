# 🎯 SkillCheck AI

> **Teste-toi avant d'apprendre.** Un copilote d'apprentissage diagnostique qui inverse la logique classique : au lieu d'expliquer d'abord, il **teste d'abord**, détecte tes lacunes et tes **faux acquis**, puis ne t'enseigne que ce qui te manque.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Supabase](https://img.shields.io/badge/Supabase-pgvector-green) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-black)

---

## 💡 Le concept

SkillCheck AI suit une boucle en 3 temps :

| Étape | Ce qu'il se passe |
|-------|-------------------|
| **1. TESTER** 🎯 | Tu uploades un cours (PDF/texte). L'IA extrait les concepts-clés et te fait passer un **diagnostic adaptatif** (difficulté qui s'ajuste) en mesurant aussi ta **confiance**. |
| **2. APPRENDRE** 📚 | L'IA génère un parcours ciblé qui n'enseigne **que tes lacunes**, avec des explications **ancrées sur ton document** (RAG + citations) et des exercices. |
| **3. VÉRIFIER** ✅ | Un re-test final affiche un **score de progression chiffré** (avant / après). |

### La fonctionnalité signature : la détection des faux acquis

En croisant **confiance × justesse**, SkillCheck repère ce que tu *crois* savoir à tort :

| | ✅ Réponse juste | ❌ Réponse fausse |
|---|---|---|
| **😎 Sûr·e** | 🟢 Maîtrisé | 🔴 **Faux acquis** (priorité absolue) |
| **🤔 Hésitant·e** | 🟡 Fragile | 🟡 Fragile |

Une réponse **fausse donnée avec assurance** est le signal le plus dangereux : l'IA l'identifie (badge rouge animé), en **analyse la nature** (« tu as confondu X et Y »), et la traite en premier dans le parcours.

---

## 🛠️ Stack technique

- **Framework** : Next.js 14 (App Router) + TypeScript
- **Styling** : Tailwind CSS + composants type shadcn/ui (design system maison)
- **Base de données + Vector store** : Supabase (Postgres + `pgvector`)
- **Auth** : Supabase Auth (email/mot de passe) + middleware de protection des routes
- **LLM** : OpenAI — **GPT-4o** (analyse/génération complexe) et **GPT-4o-mini** (tâches simples, pour le coût/vitesse), toujours en **mode JSON structuré** (`response_format: json_object`)
- **Embeddings** : `text-embedding-3-small` pour le RAG
- **Carte de maîtrise** : React Flow (nœuds colorés, mise à jour temps réel)
- **Déploiement** : compatible Vercel

> 🔒 **Sécurité** : la clé OpenAI n'est **jamais** exposée au client. Tous les appels LLM/RAG passent par des API routes serveur. Les secrets sont lus via variables d'environnement (voir `.env.example`).

---

## 📁 Architecture

```
src/
├── app/
│   ├── page.tsx                          # Landing (public)
│   ├── login / signup                    # Authentification
│   ├── dashboard/                        # Upload + historique des parcours
│   ├── diagnostic/[sessionId]/           # Étape 1 — Tester
│   ├── learn/[sessionId]/                # Étape 2 — Apprendre
│   ├── retest/[sessionId]/               # Re-test (réutilise le diagnostic)
│   ├── results/[sessionId]/              # Étape 3 — Vérifier
│   └── api/
│       ├── documents/route.ts            # Upload + ingestion complète
│       ├── sessions/[id]/route.ts        # État d'une session (sans réponses)
│       ├── sessions/[id]/phase/route.ts  # Transition de phase + scores
│       ├── answers/route.ts              # Grade + maîtrise + analyse d'erreur
│       └── learn/route.ts                # Leçon RAG à la demande
├── components/
│   ├── ui/                               # Primitives (button, card, badge…)
│   ├── screens/                          # Contrôleurs Diagnostic/Learn/Results
│   ├── MasteryMap.tsx                    # Carte React Flow temps réel
│   ├── QuestionCard.tsx                  # Question + confiance + feedback
│   ├── LessonCard.tsx                    # Leçon RAG + exercice interactif
│   └── ProgressCompare.tsx               # Compteurs animés avant/après
├── lib/
│   ├── openai.ts        # Client + helper JSON mode (4o / 4o-mini)
│   ├── supabase/        # Clients browser / server / admin + middleware
│   ├── rag.ts           # Chunking, embeddings, recherche vectorielle
│   ├── pdf.ts           # Extraction de texte PDF/texte
│   ├── prompts.ts       # Tous les prompts LLM centralisés
│   ├── mastery.ts       # Logique métier : scoring + adaptatif (pure, testable)
│   ├── services.ts      # Orchestration LLM + RAG + persistance
│   ├── guards.ts        # Vérifications d'appartenance (sécurité)
│   └── api.ts           # withAuth + gestion d'erreurs uniforme
└── types/               # Types partagés
```

**Principes** : logique métier (`mastery.ts`) isolée de l'UI et de la DB ; appels LLM/RAG regroupés dans des services dédiés ; composants réutilisables ; gestion d'erreurs de bout en bout (upload, réponse LLM invalide, etc.).

---

## 🗄️ Modèle de données

7 tables (Postgres + pgvector) : `documents`, `document_chunks` (RAG), `concepts`, `questions`, `sessions`, `reponses`, `maitrise`. Row Level Security activé sur toutes les tables (chaque utilisateur ne voit que ses données). Voir [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

> Le RAG s'appuie sur `document_chunks` (embedding par passage) via la fonction RPC `match_chunks`, pour des citations précises et vérifiables.

---

## 🚀 Installation & lancement

### 1. Prérequis
- Node.js 18+ (20+ recommandé)
- Un projet [Supabase](https://supabase.com)
- Une clé API [OpenAI](https://platform.openai.com)

### 2. Cloner et installer
```bash
npm install
```

### 3. Configurer la base de données
Dans le **SQL Editor** de Supabase, exécute le contenu de
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
Cela active `pgvector`, crée les tables, les index vectoriels, la fonction
`match_chunks` et les politiques RLS.

> 💡 Pour une démo fluide sans e-mails de confirmation : dans Supabase →
> **Authentication → Providers → Email**, désactive *"Confirm email"*.

### 4. Variables d'environnement
Copie `.env.example` en `.env.local` et renseigne :

```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

| Variable | Rôle | Exposée au client ? |
|----------|------|:---:|
| `OPENAI_API_KEY` | Appels LLM + embeddings | ❌ Non |
| `SUPABASE_SERVICE_ROLE_KEY` | Écritures serveur (contourne RLS) | ❌ Non |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet | ✅ Oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + lecture RLS côté client | ✅ Oui |
| `OPENAI_MODEL_COMPLEX` / `OPENAI_MODEL_SIMPLE` | Surcharge des modèles | ❌ Non |

### 5. Lancer
```bash
npm run dev      # http://localhost:3000
```

Crée un compte, uploade un cours (PDF ou `.txt`), et lance ton diagnostic 🎉

---

## 🧩 Fonctionnalités implémentées

**MVP (boucle complète de bout en bout)**
- [x] Upload PDF/texte → extraction + vectorisation (RAG)
- [x] Extraction automatique des concepts-clés (LLM)
- [x] Génération de questions de diagnostic
- [x] Écran de diagnostic avec **niveau de confiance** par réponse
- [x] Analyse → statut de maîtrise (Maîtrisé / Fragile / Faux acquis / Non testé)
- [x] Écran "Apprendre" : explication **ancrée sur le document (citation)** + exercice
- [x] Re-test + écran de progression (score avant/après animé)

**Fonctionnalités innovantes**
- [x] **Diagnostic adaptatif** : la difficulté s'ajuste à la performance récente
- [x] **Détection des faux acquis** : confiance × justesse (badge rouge animé, priorité)
- [x] **Analyse de la misconception** : l'IA explique la *nature* de l'erreur
- [x] **Carte de maîtrise interactive** (React Flow) mise à jour **en temps réel**

---

## 📱 Design

Thème clair épuré (inspiration Linear / Notion / Duolingo), couleur d'accent indigo,
code couleur maîtrise 🟢🟡🔴⚪, entièrement **responsive** (mobile → desktop),
micro-interactions, skeletons de chargement, transitions douces, accessibilité de base.

---

## 🚢 Déploiement (Vercel)

1. Push le repo sur GitHub.
2. Importe le projet sur [Vercel](https://vercel.com).
3. Ajoute les mêmes variables d'environnement.
4. Deploy. (Rien de spécifique : l'app est compatible serverless.)

---

_SkillCheck AI — parce que réviser ce qu'on sait déjà, c'est perdre son temps._
