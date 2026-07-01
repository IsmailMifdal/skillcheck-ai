# 🎯 SkillCheck AI — Livrable

> **Teste-toi avant d'apprendre.** Un copilote d'apprentissage diagnostique qui, au lieu d'expliquer d'abord, **teste d'abord** : il détecte tes lacunes et tes *faux acquis*, puis ne t'enseigne que ce qui te manque.

---

## 🔗 Accès

| | |
|---|---|
| **Démo en ligne** | _À compléter après déploiement_ → `https://skillcheck-ai.vercel.app` |
| **Code source** | https://github.com/IsmailMifdal/skillcheck-ai |
| **Statut** | MVP fonctionnel de bout en bout ✅ |

---

## 💡 Le problème & la solution

**Problème :** on révise souvent ce qu'on sait déjà, et on ignore ce qu'on croit maîtriser… à tort (les *faux acquis*). L'apprentissage classique explique avant de vérifier.

**Solution :** SkillCheck AI inverse la logique en 3 temps :

| Étape | Ce qu'il se passe |
|:---:|---|
| **1. TESTER** 🎯 | Upload d'un cours (PDF/texte) → l'IA extrait les concepts-clés et lance un **diagnostic adaptatif** (la difficulté s'ajuste), en mesurant aussi la **confiance** de l'apprenant. |
| **2. APPRENDRE** 📚 | Un parcours ciblé qui n'enseigne **que les lacunes**, avec des explications **ancrées sur le document** (RAG + citations) et des exercices. |
| **3. VÉRIFIER** ✅ | Un re-test final affiche un **score de progression chiffré** (avant / après). |

---

## ⭐ La fonctionnalité signature : la détection des faux acquis

En croisant **confiance × justesse**, l'app repère ce qu'on *croit* savoir à tort :

| | ✅ Réponse juste | ❌ Réponse fausse |
|---|:---:|:---:|
| **😎 Sûr·e** | 🟢 Maîtrisé | 🔴 **Faux acquis** *(priorité absolue)* |
| **🤔 Hésitant·e** | 🟡 Fragile | 🟡 Fragile |

Une réponse **fausse donnée avec assurance** = le signal le plus dangereux. L'IA l'identifie (badge rouge animé), **explique la nature de l'erreur** (« tu as confondu X et Y »), et la traite en premier.

---

## 🧩 Fonctionnalités livrées

**Cœur (MVP complet)**
- ✅ Upload PDF/texte → extraction + vectorisation (RAG)
- ✅ Extraction automatique des concepts-clés (LLM)
- ✅ Diagnostic avec niveau de confiance par réponse
- ✅ Statut de maîtrise par concept (Maîtrisé / Fragile / Faux acquis / Non testé)
- ✅ Parcours « Apprendre » : explications sourcées sur le document + exercices
- ✅ Re-test + écran de progression animé (score avant/après)

**Innovations**
- ✅ **Diagnostic adaptatif** : la difficulté suit la performance
- ✅ **Détection des faux acquis** (confiance × justesse)
- ✅ **Analyse de la misconception** : l'IA explique *pourquoi* c'est faux
- ✅ **Carte de maîtrise interactive** (React Flow), mise à jour **en temps réel**

---

## 🛠️ Stack technique

- **Frontend** : Next.js 14 (App Router) · TypeScript · Tailwind CSS · UI type shadcn
- **Backend / DB** : Supabase (Postgres + **pgvector**) · Auth email · Row Level Security
- **IA** : OpenAI **GPT-4o** (analyse/génération) + **GPT-4o-mini** (tâches simples) en **mode JSON structuré**
- **RAG** : embeddings `text-embedding-3-small` + recherche vectorielle
- **Visualisation** : React Flow · **Déploiement** : Vercel

> 🔒 **Sécurité** : clé OpenAI 100 % côté serveur (jamais exposée au client), secrets en variables d'environnement, RLS activé sur toutes les tables.

---

## ▶️ Lancer en local (résumé)

```bash
npm install
# 1) Exécuter supabase/migrations/0001_init.sql dans Supabase (SQL Editor)
# 2) Copier .env.example -> .env.local et renseigner les 4 clés
npm run dev        # http://localhost:3000
```

_Détails complets dans le [README](README.md)._

---

## 📐 Qualité & architecture

- Logique métier (scoring, adaptatif) **isolée** de l'UI et de la base — testable
- Appels LLM & RAG regroupés dans des **services dédiés**
- Gestion d'erreurs de bout en bout (upload, réponse LLM invalide…)
- **CI GitHub Actions** : typecheck + lint + build à chaque push
- Frontend responsive (mobile → desktop), design épuré, micro-interactions

---

<p align="center"><em>SkillCheck AI — parce que réviser ce qu'on sait déjà, c'est perdre son temps.</em></p>
