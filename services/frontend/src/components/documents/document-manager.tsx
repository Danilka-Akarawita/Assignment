'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import * as knowledgeApi from '@/lib/api/knowledge';
import { useAuthStore } from '@/lib/auth/store';
import type { KnowledgeDocument } from '@/lib/types';
import { FileUp, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function DocumentManager() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof knowledgeApi.searchDocuments>>['results']
  >([]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { documents: docs } = await knowledgeApi.listDocuments(accessToken);
      setDocuments(docs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [load]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    try {
      await knowledgeApi.uploadDocument(accessToken, file);
      toast.success('Document queued for processing');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onDelete = async (id: number) => {
    if (!accessToken) return;
    try {
      await knowledgeApi.deleteDocument(accessToken, id);
      toast.success('Document deleted');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const onSearch = async () => {
    if (!accessToken || !searchQuery.trim()) return;
    try {
      const res = await knowledgeApi.searchDocuments(accessToken, searchQuery.trim());
      setSearchResults(res.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed');
    }
  };

  const statusColor = (status: KnowledgeDocument['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'PROCESSING':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <header className="rounded-2xl border border-brand-200/70 bg-card px-6 py-5 shadow-card">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge management</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload documents for the agent to search via knowledge_retrieval.
        </p>
      </header>

      <Card className="border-brand-200/70 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Upload document</CardTitle>
          <CardDescription>PDF or plain text, max 10MB</CardDescription>
        </CardHeader>
        <CardContent>
          <Label
            htmlFor="file-upload"
            className="border-brand-300/50 hover:bg-brand-100/40 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-8 transition-colors"
          >
            {uploading ? (
              <Loader2 className="size-8 animate-spin opacity-50" />
            ) : (
              <FileUp className="size-8 opacity-50" />
            )}
            <span className="text-sm font-medium">
              {uploading ? 'Uploading…' : 'Choose file'}
            </span>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.txt,text/plain,application/pdf"
              className="hidden"
              onChange={(e) => void onUpload(e)}
              disabled={uploading}
            />
          </Label>
        </CardContent>
      </Card>

      <Card className="border-brand-200/70 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Your documents</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1 size-3.5" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex justify-center py-8">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No documents yet.</p>
          ) : (
            <ul className="space-y-3">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-brand-200/60 p-4 transition-colors hover:bg-brand-50/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {doc.title ?? doc.filename}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {doc.filename} · {doc.chunkCount} chunks
                    </p>
                    {doc.summary && (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        {doc.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={statusColor(doc.status)}>{doc.status}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void onDelete(doc.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-brand-200/70 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Semantic search</CardTitle>
          <CardDescription>Test the knowledge API directly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. What is the refund policy?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void onSearch()}
            />
            <Button onClick={() => void onSearch()}>
              <Search className="size-4" />
            </Button>
          </div>
          {searchResults.length > 0 && (
            <ScrollArea className="h-48 rounded-md border p-3">
              <ul className="space-y-3 text-sm">
                {searchResults.map((r, i) => (
                  <li key={i} className="border-b pb-2 last:border-0">
                    <p className="text-muted-foreground text-xs">
                      {r.title ?? 'Chunk'} · similarity {(r.similarity * 100).toFixed(0)}%
                    </p>
                    <p className="mt-1 line-clamp-3">{r.chunkText}</p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
