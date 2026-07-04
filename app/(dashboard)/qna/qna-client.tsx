"use client";

import {
  Loader2,
  MessageCircle,
  MessageSquarePlus,
  Send,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ROLE_LABELS } from "@/components/layout/role-label";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/generated/prisma/client";
import { cn, formatDateTime, getInitials } from "@/lib/utils";

type Author = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
};

type Answer = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
};

type Question = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  author: Author;
  answers: Answer[];
};

export function QnaClient({
  currentUserId,
  currentUserRole,
  initial,
}: {
  currentUserId: string;
  currentUserRole: Role;
  initial: Question[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);

  // Per-question reply drafts (id → body). Kept lokal biar tidak mengganggu
  // ketika typing di banyak pertanyaan sekaligus.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<Record<string, boolean>>({});

  const isAdmin =
    currentUserRole === "SUPER_ADMIN" || currentUserRole === "KETUA";

  // Sync from server refresh.
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setQuestions(initial);
  }

  async function createQuestion() {
    if (title.trim().length < 3) {
      toast.error("Judul minimal 3 karakter");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/qna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body: body || null }),
    });
    const json = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal mengirim");
      return;
    }
    toast.success("Pertanyaan diposting");
    setTitle("");
    setBody("");
    setCreateOpen(false);
    router.refresh();
  }

  async function postAnswer(questionId: string) {
    const draft = drafts[questionId]?.trim();
    if (!draft) {
      toast.error("Isi jawaban dulu");
      return;
    }
    setPosting((p) => ({ ...p, [questionId]: true }));
    const res = await fetch(`/api/qna/${questionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const json = await res.json().catch(() => ({}));
    setPosting((p) => ({ ...p, [questionId]: false }));
    if (!res.ok) {
      toast.error(json.error?.message ?? "Gagal mengirim");
      return;
    }
    setDrafts((d) => ({ ...d, [questionId]: "" }));
    router.refresh();
  }

  async function deleteQuestion(id: string) {
    if (!window.confirm("Hapus pertanyaan ini beserta semua jawabannya?")) return;
    const res = await fetch(`/api/qna/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    toast.success("Pertanyaan dihapus");
    router.refresh();
  }

  async function deleteAnswer(questionId: string, answerId: string) {
    if (!window.confirm("Hapus jawaban ini?")) return;
    const res = await fetch(`/api/qna/${questionId}/answers/${answerId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Gagal menghapus");
      return;
    }
    toast.success("Jawaban dihapus");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {questions.length} pertanyaan · Terbuka untuk semua anggota
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Tanya / Diskusi Baru
        </Button>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Belum ada pertanyaan"
          description="Mulai diskusi pertama — apapun bisa ditanyakan: ide kegiatan, kendala teknis, atau sekadar minta pendapat tim."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <MessageSquarePlus className="mr-2 h-4 w-4" /> Tanya sesuatu
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => {
            const isOwn = q.author.id === currentUserId;
            const canDelete = isOwn || isAdmin;
            return (
              <Card key={q.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={q.author.avatarUrl ?? undefined} />
                      <AvatarFallback>
                        {getInitials(q.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {q.author.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {ROLE_LABELS[q.author.role]}
                        </Badge>
                        <span>· {formatDateTime(q.createdAt)}</span>
                      </div>
                      <h3 className="mt-1 text-base font-semibold leading-snug">
                        {q.title}
                      </h3>
                      {q.body && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {q.body}
                        </p>
                      )}
                    </div>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQuestion(q.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Hapus pertanyaan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {q.answers.length} jawaban
                  </p>
                  {q.answers.map((a) => {
                    const canDeleteAnswer =
                      a.author.id === currentUserId || isAdmin;
                    return (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={a.author.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(a.author.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">
                              {a.author.name}
                            </span>
                            <span>· {formatDateTime(a.createdAt)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {a.body}
                          </p>
                        </div>
                        {canDeleteAnswer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteAnswer(q.id, a.id)}
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label="Hapus jawaban"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-start gap-2 pt-1">
                    <textarea
                      rows={2}
                      value={drafts[q.id] ?? ""}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                      }
                      placeholder="Tulis jawaban atau tanggapan…"
                      className={cn(
                        "flex-1 resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      )}
                    />
                    <Button
                      size="icon"
                      onClick={() => postAnswer(q.id)}
                      disabled={posting[q.id]}
                      aria-label="Kirim jawaban"
                    >
                      {posting[q.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tanya / Diskusi Baru</DialogTitle>
            <DialogDescription>
              Apapun yang mau dibahas — pertanyaan teknis, ide kegiatan, atau
              sekadar minta pendapat tim.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="q-title">
                Judul <span className="text-destructive">*</span>
              </Label>
              <Input
                id="q-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ringkasan singkat dalam 1 kalimat"
                className="h-10"
                disabled={creating}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-body">Detail (opsional)</Label>
              <textarea
                id="q-body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Konteks, contoh, atau apa yang sudah dicoba…"
                className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={creating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Batal
            </Button>
            <Button onClick={createQuestion} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Posting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
