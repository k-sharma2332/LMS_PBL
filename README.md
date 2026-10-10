# SkillQuest AI

SkillQuest AI is a responsive React and TypeScript learning platform using Supabase for identity, course data, enrollments, lesson progress, notes, bookmarks, quiz results, and learning activity.

## Run locally

```sh
npm install
npm run dev
```

## Deploy on Netlify

You can deploy without GitHub by creating a root `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, running `npm run build`, then signing in to Netlify and choosing **Add new site → Deploy manually** to upload the generated `dist` folder. Use the Supabase project's public anon/publishable key; never use the service-role key.

If you later connect a GitHub repository, Netlify reads `netlify.toml` to build with `npm run build` and publish `dist`; add the two `VITE_SUPABASE_*` values in the Netlify site environment-variable settings before deploying.

In Supabase **Authentication → URL Configuration**, set the deployed Netlify URL as the Site URL and add it to the allowed Redirect URLs. The redirect configuration supports direct navigation and refreshes on app routes such as `/admin`.

The Netlify redirect configuration supports direct navigation and refreshes on app routes such as `/admin`.

## Connect Supabase

The app uses the public Supabase anon/publishable key in the browser. Never put a Supabase service-role key or database password in `.env` or frontend code.

1. Copy `.env.example` to `.env` in the project root.
2. In Supabase **Project Settings → API**, copy your project URL and public anon/publishable key into `.env`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
   ```

3. In Supabase **Authentication → Providers → Email**, enable Email. Configure local/deployed app addresses in **Authentication → URL Configuration**. To let users sign in immediately after registration, turn off **Confirm email** in the Email provider settings. This is a Supabase project setting, not something the frontend can override. Disabling it means unverified email addresses can register; admin access still requires approval by an existing administrator.
4. Apply the database migrations in order: sign in to the Supabase dashboard, open **SQL Editor → New query**, paste and run [`supabase/migrations/202610100001_initial_lms.sql`](./supabase/migrations/202610100001_initial_lms.sql), then run migrations [`002`](./supabase/migrations/202610100002_admin_quiz_authoring.sql), [`003`](./supabase/migrations/202610100003_admin_access_requests.sql), and [`004`](./supabase/migrations/202610100004_assignments_reviews_course_editing.sql). They provide the schema and learning RPCs, secure quiz authoring, administrator access requests/approval, assignment workflows, student reviews, and the policies needed for course editing. If the initial schema is already installed, run only the migrations that have not yet been applied.
5. Restart `npm run dev` after changing `.env`.

The migration is not applied automatically by this project. Until it has been run, authentication may create users but database-backed pages will show a setup/query error.

If signup shows **email rate limit exceeded**, Supabase has limited outgoing signup emails for the project. Repeated retries will not bypass that limit. In Supabase, turn off **Confirm email** under **Authentication → Providers → Email** if immediate signup is intended, or configure custom SMTP there for confirmation emails. If the limit has already been reached, wait for Supabase's email limit window to reset before retrying.

## Create the first administrator

The first administrator must be bootstrapped by the trusted Supabase project owner; there is no existing administrator who can approve the first request.

1. Create an account using **Administrator → Create account and request admin access** on the app start page. If email confirmation is enabled, confirm the email before signing in.
2. In Supabase **SQL Editor**, run this as the trusted project owner, replacing the email with the administrator's account email:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id from auth.users
     where email = 'admin@example.com'
   );
   ```

3. Sign out of the app and sign in at `/admin/login`. Admin routes and course-management operations check the database-backed role. After this first administrator exists, users can request access through **Administrator → Create account and request admin access** on the homepage, and an existing administrator can approve or reject each request in the admin dashboard.

Only an already trusted Supabase project owner should run this bootstrap SQL. Replace `admin@example.com` with the exact email used to create the account, then run the query. Public registration creates a normal student profile and a pending access request; it does not grant administrator privileges. After this one-time setup, other requests can be approved from the Admin dashboard.

## Connected features

- Student registration, sign in, password reset, session restoration, and role-checked admin sign in use Supabase Auth.
- The student course explorer and landing-page catalog read published database courses. Enrollments and course bookmarks persist.
- The course map, lesson content, progress, notes, lesson bookmarks, quiz attempts, scores, and XP use Supabase tables/RPCs with row-level security.
- Student analytics use recorded activity, lesson progress, streak/XP records, and submitted quiz attempts.
- The administrator overview reads actual account/course/enrollment activity. Admins can create and edit courses, add lessons and published multiple-choice quizzes, publish/unpublish courses, approve or reject administrator-access requests, create course assignments, and grade learner submissions with feedback. A course must have a published lesson before it can be published. Published courses appear in the student catalog and dashboard, where learners can enroll, take lesson quizzes, complete assignments, and leave course reviews.
- Students can view and update ungraded assignment submissions in **My assignments**, then view the grade and feedback when an administrator grades them. Enrolled students can leave one editable rating/review per course; admins can view recent course feedback.
- Users can request admin access from the homepage. Sign-up creates a normal student account and a pending request; only an already-approved administrator can grant the admin role from the admin dashboard.

The AI coach still uses a clearly labeled local placeholder response; connect a secure server-side AI endpoint before treating it as an AI feature. Administrators can add lesson notes/content from the dashboard; rich video/resource editing is not implemented yet.

## Routes

| Screen | Route |
| --- | --- |
| Landing page | `/` |
| Student login | `/login` |
| Student registration | `/register` |
| Admin login | `/admin/login` |
| Student dashboard | `/app` |
| Course explorer | `/courses` |
| Course learning map | `/courses/:courseId/map` |
| Lesson | `/lesson/:lessonId` |
| Quiz | `/quiz/:quizId` |
| AI Learning Coach | `/coach` |
| Progress & analytics | `/analytics` |
| Student assignments | `/assignments` |
| Admin dashboard | `/admin` |

## Checks

```sh
npm run build
npm run lint
```

## Stack

- React, TypeScript, and Vite
- React Router
- Tailwind CSS (Vite plugin) with a small custom visual system
- Supabase JS client and PostgreSQL
- Lucide React icons and Recharts
