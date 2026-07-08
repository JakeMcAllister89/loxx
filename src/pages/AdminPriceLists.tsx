import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Search, Save, Trash2, Plus, Download, Upload, Check, ChevronsUpDown } from "lucide-react";

interface OrgRow { id: string; name: string }
interface MemberRow { org_id: string; email: string | null; org_role: string; status: string }
interface DefaultRow { org_id: string; default_margin_pct: number | null }
interface ProductRow { id: string; code: string; name: string; is_active: boolean }
interface OverrideRow { id: string; org_id: string; product_id: string; margin_pct: number }

export default function AdminPriceLists() {
  const { user: me } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [defaults, setDefaults] = useState<DefaultRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [ovSearch, setOvSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [ovEdits, setOvEdits] = useState<Record<string, string>>({});
  const [addFor, setAddFor] = useState<OrgRow | null>(null);
  const [addProductId, setAddProductId] = useState<string>("");
  const [addMargin, setAddMargin] = useState<string>("");
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    const [o, m, d, p, ov] = await Promise.all([
      supabase.from("organisations").select("id,name").order("name"),
      supabase.from("org_members").select("org_id,email,org_role,status").eq("status", "active"),
      supabase.from("customer_pricing").select("org_id,default_margin_pct"),
      supabase.from("products").select("id,code,name,is_active").eq("is_active", true).order("code"),
      supabase.from("customer_product_pricing").select("id,org_id,product_id,margin_pct"),
    ]);
    setOrgs(((o.data as any) ?? []) as OrgRow[]);
    setMembers(((m.data as any) ?? []) as MemberRow[]);
    setDefaults(((d.data as any) ?? []) as DefaultRow[]);
    setProducts(((p.data as any) ?? []) as ProductRow[]);
    setOverrides(((ov.data as any) ?? []) as OverrideRow[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const orgContact = (orgId: string) => {
    const master = members.find(m => m.org_id === orgId && m.org_role === "master_admin");
    if (master?.email) return master.email;
    return members.find(m => m.org_id === orgId)?.email ?? "—";
  };
  const defaultFor = (orgId: string) => defaults.find(d => d.org_id === orgId)?.default_margin_pct ?? null;
  const orgById = (id: string) => orgs.find(o => o.id === id);
  const productById = (id: string) => products.find(p => p.id === id);

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgs;
    return orgs.filter(o => o.name.toLowerCase().includes(q));
  }, [orgs, search]);

  // Group overrides by org
  const overrideGroups = useMemo(() => {
    const orgIdsWith = Array.from(new Set(overrides.map(o => o.org_id)));
    const q = ovSearch.trim().toLowerCase();
    return orgIdsWith
      .map(id => ({ org: orgById(id), items: overrides.filter(x => x.org_id === id) }))
      .filter(g => g.org && (!q || g.org!.name.toLowerCase().includes(q)))
      .sort((a, b) => (a.org!.name).localeCompare(b.org!.name));
  }, [overrides, orgs, ovSearch]);

  const saveDefault = async (orgId: string) => {
    const raw = edits[orgId];
    if (raw === undefined) return;
    const trimmed = raw.trim();
    if (trimmed === "") {
      const { error } = await supabase.from("customer_pricing").delete().eq("org_id", orgId);
      if (error) { toast.error(error.message); return; }
      toast.success("Reverted to standard pricing");
    } else {
      const num = Number(trimmed);
      if (!Number.isFinite(num) || num < 1 || num > 99) { toast.error("Margin must be between 1 and 99"); return; }
      const { error } = await supabase.from("customer_pricing").upsert({
        org_id: orgId, default_margin_pct: num, updated_by: me?.id, updated_at: new Date().toISOString(),
      } as any, { onConflict: "org_id" });
      if (error) { toast.error(error.message); return; }
      toast.success("Default margin saved");
    }
    setEdits(prev => { const n = { ...prev }; delete n[orgId]; return n; });
    loadAll();
  };

  const saveOverride = async (row: OverrideRow) => {
    const raw = ovEdits[row.id];
    if (raw === undefined) return;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 1 || num > 99) { toast.error("Margin must be between 1 and 99"); return; }
    const { error } = await supabase.from("customer_product_pricing").update({
      margin_pct: num, updated_by: me?.id, updated_at: new Date().toISOString(),
    } as any).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Override saved");
    setOvEdits(prev => { const n = { ...prev }; delete n[row.id]; return n; });
    loadAll();
  };

  const deleteOverride = async (row: OverrideRow) => {
    const { error } = await supabase.from("customer_product_pricing").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Override removed");
    loadAll();
  };

  const submitAdd = async () => {
    if (!addFor || !addProductId) { toast.error("Pick a product"); return; }
    const num = Number(addMargin);
    if (!Number.isFinite(num) || num < 1 || num > 99) { toast.error("Margin must be between 1 and 99"); return; }
    const { error } = await supabase.from("customer_product_pricing").upsert({
      org_id: addFor.id, product_id: addProductId, margin_pct: num, updated_by: me?.id, updated_at: new Date().toISOString(),
    } as any, { onConflict: "org_id,product_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Override added");
    setAddFor(null); setAddProductId(""); setAddMargin("");
    loadAll();
  };

  const exportCsv = () => {
    const rows: string[] = ["org_name,product_code,product_name,margin_pct"];
    for (const o of overrides) {
      const org = orgById(o.org_id); const p = productById(o.product_id);
      if (!org || !p) continue;
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      rows.push([esc(org.name), esc(p.code), esc(p.name), String(o.margin_pct)].join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `product-overrides-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = []; let cur: string[] = []; let cell = ""; let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') inQ = false;
        else cell += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { cur.push(cell); cell = ""; }
        else if (c === "\n") { cur.push(cell); rows.push(cur); cur = []; cell = ""; }
        else if (c === "\r") { /* skip */ }
        else cell += c;
      }
    }
    if (cell.length || cur.length) { cur.push(cell); rows.push(cur); }
    return rows.filter(r => r.some(v => v !== ""));
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) { toast.error("Empty CSV"); return; }
    const header = rows[0].map(h => h.trim().toLowerCase());
    const iOrg = header.indexOf("org_name");
    const iCode = header.indexOf("product_code");
    const iMargin = header.indexOf("margin_pct");
    if (iOrg < 0 || iCode < 0 || iMargin < 0) { toast.error("CSV needs org_name, product_code, margin_pct columns"); return; }

    const orgByName = new Map(orgs.map(o => [o.name.toLowerCase(), o]));
    const productByCode = new Map(products.map(p => [p.code.toLowerCase(), p]));
    const existing = new Map(overrides.map(o => [`${o.org_id}:${o.product_id}`, o]));

    let inserted = 0, updated = 0, skipped = 0;
    const skips: string[] = [];
    const payload: any[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const orgName = (row[iOrg] ?? "").trim();
      const code = (row[iCode] ?? "").trim();
      const margin = Number((row[iMargin] ?? "").trim());
      if (!orgName || !code) { skipped++; skips.push(`Row ${r + 1}: missing org or code`); continue; }
      if (!Number.isFinite(margin) || margin < 1 || margin > 99) { skipped++; skips.push(`Row ${r + 1}: margin out of range`); continue; }
      const org = orgByName.get(orgName.toLowerCase());
      const prod = productByCode.get(code.toLowerCase());
      if (!org) { skipped++; skips.push(`Row ${r + 1}: org "${orgName}" not found`); continue; }
      if (!prod) { skipped++; skips.push(`Row ${r + 1}: product "${code}" not found`); continue; }
      const key = `${org.id}:${prod.id}`;
      if (existing.has(key)) updated++; else inserted++;
      payload.push({ org_id: org.id, product_id: prod.id, margin_pct: margin, updated_by: me?.id, updated_at: new Date().toISOString() });
    }

    if (payload.length) {
      const { error } = await supabase.from("customer_product_pricing").upsert(payload as any, { onConflict: "org_id,product_id" });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(`Imported: ${inserted} new · ${updated} updated · ${skipped} skipped`);
    if (skips.length) console.warn("Import skipped rows:", skips);
    loadAll();
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Price Lists</h1>
          <p className="text-sm text-muted-foreground">Customer-specific pricing: default margins and per-product overrides.</p>
        </div>

        <Tabs defaultValue="defaults">
          <TabsList>
            <TabsTrigger value="defaults">Customer Defaults</TabsTrigger>
            <TabsTrigger value="overrides">Product Overrides</TabsTrigger>
          </TabsList>

          <TabsContent value="defaults" className="mt-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organisation" className="pl-9" />
            </div>

            <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Contact email</TableHead>
                    <TableHead className="w-40">Default margin %</TableHead>
                    <TableHead className="w-24 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
                  {!loading && filteredOrgs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No organisations found.</TableCell></TableRow>}
                  {filteredOrgs.map(o => {
                    const current = defaultFor(o.id);
                    const editing = edits[o.id] !== undefined;
                    const value = editing ? edits[o.id] : (current != null ? String(current) : "");
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.name}</TableCell>
                        <TableCell className="text-muted-foreground">{orgContact(o.id)}</TableCell>
                        <TableCell>
                          <Input
                            type="number" step="0.01" min="1" max="99"
                            placeholder="Standard"
                            value={value}
                            onChange={e => setEdits(prev => ({ ...prev, [o.id]: e.target.value }))}
                            className="h-8 w-32"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => saveDefault(o.id)} disabled={!editing}>
                            <Save className="h-3.5 w-3.5 mr-1" /> Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="overrides" className="mt-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={ovSearch} onChange={e => setOvSearch(e.target.value)} placeholder="Search organisation" className="pl-9" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Import CSV</Button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.currentTarget.value = ""; }} />
              </div>
            </div>

            {loading && <div className="text-center text-muted-foreground py-8">Loading…</div>}
            {!loading && overrideGroups.length === 0 && <div className="text-center text-muted-foreground py-8 rounded-[10px] border bg-card">No product overrides yet.</div>}

            <div className="space-y-4">
              {overrideGroups.map(g => (
                <div key={g.org!.id} className="rounded-[10px] border bg-card shadow-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div>
                      <div className="font-semibold">{g.org!.name}</div>
                      <div className="text-xs text-muted-foreground">{g.items.length} override{g.items.length === 1 ? "" : "s"}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setAddFor(g.org!); setAddProductId(""); setAddMargin(""); }}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add override
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Code</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-40">Margin %</TableHead>
                        <TableHead className="w-32 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.items.map(row => {
                        const p = productById(row.product_id);
                        const editing = ovEdits[row.id] !== undefined;
                        const value = editing ? ovEdits[row.id] : String(row.margin_pct);
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-mono text-xs">{p?.code ?? "—"}</TableCell>
                            <TableCell>{p?.name ?? <span className="text-muted-foreground italic">Unknown product</span>}</TableCell>
                            <TableCell>
                              <Input
                                type="number" step="0.01" min="1" max="99"
                                value={value}
                                onChange={e => setOvEdits(prev => ({ ...prev, [row.id]: e.target.value }))}
                                className="h-8 w-32"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => saveOverride(row)} disabled={!editing}>
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteOverride(row)} className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!addFor} onOpenChange={(o) => !o && setAddFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add product override</DialogTitle>
              {addFor && <p className="text-sm text-muted-foreground">{addFor.name}</p>}
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Product</label>
                <Popover open={addPickerOpen} onOpenChange={setAddPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {addProductId ? (() => { const p = productById(addProductId); return p ? `${p.code} — ${p.name}` : "Select product"; })() : "Select product"}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by code or name" />
                      <CommandList>
                        <CommandEmpty>No products found.</CommandEmpty>
                        <CommandGroup>
                          {products.map(p => (
                            <CommandItem key={p.id} value={`${p.code} ${p.name}`} onSelect={() => { setAddProductId(p.id); setAddPickerOpen(false); }}>
                              <Check className={`h-4 w-4 mr-2 ${addProductId === p.id ? "opacity-100" : "opacity-0"}`} />
                              <span className="font-mono text-xs mr-2">{p.code}</span> {p.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Margin %</label>
                <Input type="number" step="0.01" min="1" max="99" value={addMargin} onChange={e => setAddMargin(e.target.value)} placeholder="e.g. 35" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddFor(null)}>Cancel</Button>
              <Button onClick={submitAdd}>Add override</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
