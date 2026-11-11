# Course context and assessment

Source: `2110503_SWDevPractice_Syllabus_2026.pdf`, all 4 pages. English summaries of Thai passages are working translations. The original extracted text is retained in [sources](sources/README.md).

## Course purpose and teaching materials

Course 2110503 is Software Development Practice, 3 credits, first semester of academic year 2569 (2026), with 3 lecture hours per week. The named instructors are ผศ.ดร.เนื่องวงศ์ ทวยเจริญ (course lead) and รศ.ดร.พิตติพล คันธวัฒน์ (p. 1).

The course covers requirements, software quality and constraints, architecture decisions, construction, testing, production deployment, and maintenance. Objectives include explaining suitable contemporary tools and applying them to build, deploy, and maintain a prototype under constraints (p. 1).

Teaching uses slides, lecture videos (the primary lecture delivery), and software tools exercised in assignments and the term project. **The actual slides, videos, tutorial repository, and assignment handouts were not supplied.** The syllabus names materials; it does not provide their full content.

## Teaching sequence

The dates below reproduce the syllabus schedule in Gregorian year 2026. Each pair is a scheduled teaching date, not a confirmed deadline for this team (p. 2).

| Week | Dates | Topics | Assignment / quiz |
| --- | --- | --- | --- |
| 1 | Aug 4 & 9 | Ch. 01 SRS and UI; Ch. 02 DB Designs | #1 DB Designs |
| 2 | Aug 11 & 16 | Ch. 03 NoSQL | #2 NoSQL |
| 3 | Aug 18 & 23 | Ch. 04 NodeJS Setup and GIT | #3 GitHub / GIT |
| 4 | Aug 25 & 30 | Ch. 05 REST; Ch. 06 REST API, JSON, API Testing | #4 REST API |
| 5 | Sep 1 & 6 | Ch. 07 Postman and MongoDB | #5 MongoDB; project topics assigned |
| 6 | Sep 8 & 13 | Ch. 08 Authentication, first half | No assignment/quiz listed |
| 7 | Sep 15 & 20 | Ch. 08 Authentication, second half | #6 Authentication |
| — | Sep 21–27 | Midterm examination break | — |
| 8 | Sep 29 & Oct 4 | Ch. 09 Relationship and Authorization, first half | #7.1 Query |
| 9 | Oct 6 & 11 | Ch. 09 Relationship and Authorization, second half | #7.2 Authorization |
| 10 | Oct 13* & 18 | Ch. 10 SQL; Ch. 11 REST + SQL | #8 REST + SQL |
| 11 | Oct 20 & 25 | Ch. 16 Connecting with FrontEnd; Ch. 17 Introduction to LLM in Software Development | #9 Frontend; Ch. 17 has no quiz or assignment |
| 12 | Oct 27 & Nov 1 | Ch. 12 Security; Ch. 13 OpenAPI | #10 OpenAPI and Security |
| 13 | Nov 3 & 8 | Ch. 14 Deployment | #11 Deployment |
| 14 | Nov 10 & 15 | Ch. 15 System Testing | #12 System Testing |
| 15 | Nov 17 & 22 | Project presentation | Confirm the team's actual slot |

The syllabus marks Oct 13 with an asterisk and states that schedule content may change with later notice (p. 3). Do not infer a final submission deadline from the presentation dates. The frontend teaching topic does not override the project PDF's statement that a frontend is unnecessary.

## Assessment

| Component | Share of course grade |
| --- | --- |
| Quizzes | 30% |
| Tutorial assignments | 35% |
| Term project | 35% |

The project breakdown is functions 20%, presentation and demo 5%, completeness 5%, and documentation 5%, with extra credit listed separately as 3%* (pp. 1–2). These percentages add to 35% before extra credit. The supplied syllabus does not explain the extra-credit asterisk or its detailed scoring rules.

## Term-project expectations

Section 17 on p. 4 states that:

- Topics are randomly assigned by the instructor in week 5; the project is done in pairs.
- The project modifies code taught in the course to satisfy the assigned scenario.
- Each student should write code and prepare documentation/diagrams. Individual credit is proportional to work performed; doing only documentation is given as an example capped at 5%.
- The final-week presentation is at most 7 minutes, followed by at most 3 minutes of questions.
- Present the assigned problem, an automated demonstration using **Postman Runner or Newman**, code changes from the original, documentation, team work allocation, an extra-credit teaching-video link, and the project's GitHub link.
- The named documentation is **Requirements, Use Cases, Sequence Diagram, and UML Profile for API**. Explain changes relative to the original; extra-credit diagrams are not required.

The exact UML Profile for API notation/template, submission packaging, and extra-credit applicability need the course examples or instructor guidance. The context files in this folder do not replace those required final artifacts.

## Reading list and stack implications

Required readings listed on p. 3:

1. เนื่องวงศ์ ทวยเจริญ, *ฝึกพัฒนาซอฟต์แวร์ส่วนหลัง: The Backend*, June B.E. 2567 (2024).
2. Silberschatz, Korth, and Sudarshan, *Database System Concepts*, 7th edition, listed as 2020.
3. Fernando Doglio, *REST API Development with Node.js*, 2nd edition, 2018.
4. Brad Traversy, *Node.js API Masterclass With Express & MongoDB* (Udemy).

Supplementary resources cover MongoDB/importing CSV, HTTP status codes, Git/gitignore, bcrypt, JWT/node-jsonwebtoken, Mongoose population, MySQL setup and Express integration, Swagger/swagger-jsdoc, Heroku, and AWS Lambda. Their titles and URLs are preserved in the [syllabus transcription](sources/course-syllabus.md).

These references support considering a Node.js/Express backend adapted from the tutorial. They **do not establish a selected language version, package version, authentication scheme, deployment platform, or database**. In particular, MySQL examples do not expand the project database choices beyond MongoDB Atlas or PostgreSQL. The Mongoose reference appears to point at a node-jsonwebtoken URL; check the actual course material before relying on it.

Resource links and version labels are historical entries from the supplied syllabus; they have not been fetched or checked for current availability. Prefer the actual course starter and lockfile when available, then verify current official documentation when implementing.
