import { redirect } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QnaClient } from "./qna-client";

export default async function QnaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const questions = await db.qnaQuestion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true, role: true } },
      answers: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Q&A"
        description="Tempat semua anggota tim bertanya, kasih ide, atau bahas hal apapun terkait KKN."
      />
      <QnaClient
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        initial={questions.map((q) => ({
          id: q.id,
          title: q.title,
          body: q.body,
          createdAt: q.createdAt.toISOString(),
          author: q.author,
          answers: q.answers.map((a) => ({
            id: a.id,
            body: a.body,
            createdAt: a.createdAt.toISOString(),
            author: a.author,
          })),
        }))}
      />
    </div>
  );
}
