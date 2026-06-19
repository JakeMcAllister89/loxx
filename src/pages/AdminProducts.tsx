import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, Minus, ArrowUpDown, Upload, FileDown, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

export interface AdminProduct {
  id?: string;
  name: string;
  code: string;
  cylinder_type: string;
  pin_count: number;
  finish: string;
  size: string;
  price_gbp: number;
  cost_price: number | null;
  description: string | null;
  bs_en_1303: boolean;
  security_rating: string | null;
  image_url: string | null;
  is_active: boolean;
}

const TYPES = ["Single", "Double", "Oval", "Thumbturn", "Mortice"];

const blank = (): AdminProduct => ({
  name: "", code: "", cylinder_type: "Double", pin_count: 6, finish: "Satin Nickel",
  size: "35/35", price_gbp: 0, cost_price: 0, description: "", bs_en_1303: true,
  security_rating: null, image_url: null, is_active: true,
});

function marginColor(m: number) {
  if (m < 30) return "text-red-600";
  if (m > 40) return "text-amber-600";
  return "text-green-600";
}

function calcMargin(cost: number | null, sell: number) {
  if (!sell || sell <= 0 || cost == null) return null;
  return ((sell - cost) / sell) * 100;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [sortKey, setSortKey] = useState<keyof AdminProduct>("cylinder_type");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("cylinder_type").order("price_gbp");
    setProducts((data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const sorted = useMemo(() => {
    const arr = [...products];
    arr.sort((a, b) => {
      const av = (a as any)[sortKey]; const bv = (b as any)[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [products, sortKey, sortDir]);

  const toggleSort = (k: keyof AdminProduct) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const openNew = () => { setEditing(blank()); setDrawerOpen(true); };
  const openEdit = (p: AdminProduct) => { setEditing({ ...p }); setDrawerOpen(true); };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    const { error } = await supabase.from("products").update({ is_active: false }).eq("id", deleteTarget.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product removed from catalogue");
    setDeleteTarget(null);
    load();
  };

  const activeCount = products.filter(p => p.is_active).length;

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Product catalogue</h1>
            <Badge variant="secondary" className="font-mono">{activeCount} products</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="h-4 w-4" /> Import CSV</Button>
            <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-white"><Plus className="h-4 w-4" /> Add product</Button>
          </div>
        </div>

        <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 w-14"></th>
                {([
                  ["name","Name"],["code","Code"],["cylinder_type","Type"],["finish","Finish"],["size","Size"],
                  ["cost_price","Cost"],["price_gbp","Sell"],
                ] as [keyof AdminProduct, string][]).map(([k,l]) => (
                  <th key={k} className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {l} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-left">Margin</th>
                <th className="px-3 py-2 text-left">BS EN 1303</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const m = calcMargin(p.cost_price, p.price_gbp);
                return (
                  <tr key={p.id} className={`border-t ${!p.is_active ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2">
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="h-10 w-10 rounded object-cover bg-muted" />
                        : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>}
                    </td>
                    <td className="px-3 py-2 font-medium">{p.name}{!p.is_active && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                    <td className="px-3 py-2"><Badge variant="outline">{p.cylinder_type}</Badge></td>
                    <td className="px-3 py-2">{p.finish}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.size}</td>
                    <td className="px-3 py-2 font-mono text-green-700">£{Number(p.cost_price ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono font-semibold">£{Number(p.price_gbp).toFixed(2)}</td>
                    <td className={`px-3 py-2 font-mono ${m == null ? "text-muted-foreground" : marginColor(m)}`}>{m == null ? "—" : `${m.toFixed(1)}%`}</td>
                    <td className="px-3 py-2">{p.bs_en_1303 ? <Check className="h-4 w-4 text-green-600" /> : <Minus className="h-4 w-4 text-muted-foreground" />}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(p)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={11} className="text-center text-muted-foreground py-10">No products yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        product={editing}
        onSaved={() => { setDrawerOpen(false); load(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove it from the catalogue. Any systems currently using this product code will not be affected — the cylinder type will remain on existing nodes but the product will no longer be selectable for new cylinders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onDone={load} />
    </DashboardLayout>
  );
}

function ProductDrawer({ open, onOpenChange, product, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void; product: AdminProduct | null; onSaved: () => void;
}) {
  const [p, setP] = useState<AdminProduct>(product ?? blank());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (product) setP(product); }, [product]);

  const margin = calcMargin(p.cost_price, p.price_gbp);
  const profit = (p.price_gbp || 0) - (p.cost_price || 0);
  const suggested = p.cost_price ? p.cost_price * 2 : 0;

  const upd = (k: keyof AdminProduct, v: any) => setP({ ...p, [k]: v });

  const onUpload = async (file: File) => {
    if (!p.code) { toast.error("Set a product code first"); return; }
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${p.code}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    upd("image_url", `${data.publicUrl}?t=${Date.now()}`);
    toast.success("Image uploaded");
  };

  const save = async (addAnother = false) => {
    if (!p.name || !p.code) { toast.error("Name and code required"); return; }
    setSaving(true);
    const payload: any = {
      name: p.name, code: p.code, cylinder_type: p.cylinder_type, pin_count: p.pin_count,
      finish: p.finish, size: p.size, price_gbp: p.price_gbp, cost_price: p.cost_price,
      description: p.description, bs_en_1303: p.bs_en_1303, security_rating: p.security_rating,
      image_url: p.image_url, is_active: p.is_active,
    };
    let error;
    if (p.id) {
      ({ error } = await supabase.from("products").update(payload).eq("id", p.id));
    } else {
      ({ error } = await supabase.from("products").insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product saved");
    if (addAnother) { setP(blank()); return; }
    onSaved();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{p.id ? "Edit product" : "Add product"}</SheetTitle>
          <SheetDescription>{p.id ? p.code : "Create a new catalogue item"}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Basic info</div>
            <div><Label>Product name *</Label><Input value={p.name} onChange={e => upd("name", e.target.value)} /></div>
            <div><Label>Product code *</Label><Input className="font-mono" placeholder="e.g. EKZ-12" value={p.code} onChange={e => upd("code", e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={p.description ?? ""} onChange={e => upd("description", e.target.value)} /></div>
          </section>

          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Classification</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cylinder type</Label>
                <Select value={p.cylinder_type} onValueChange={v => upd("cylinder_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pin count</Label>
                <Select value={String(p.pin_count)} onValueChange={v => upd("pin_count", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="5">5</SelectItem><SelectItem value="6">6</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Size</Label><Input placeholder="e.g. 35/35" value={p.size} onChange={e => upd("size", e.target.value)} /></div>
              <div><Label>Finish</Label><Input value={p.finish} onChange={e => upd("finish", e.target.value)} /></div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Pricing</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost price (ex VAT)</Label>
                <Input type="number" step="0.01" value={p.cost_price ?? ""} onChange={e => upd("cost_price", e.target.value === "" ? null : Number(e.target.value))} />
                <p className="text-[11px] text-muted-foreground mt-1">Your cost from supplier</p>
              </div>
              <div>
                <Label>Selling price (ex VAT)</Label>
                <Input type="number" step="0.01" value={p.price_gbp} onChange={e => upd("price_gbp", Number(e.target.value))} />
                <p className="text-[11px] text-muted-foreground mt-1">Customer price</p>
              </div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className={margin == null ? "text-muted-foreground" : marginColor(margin)}>
                Margin: {margin == null ? "—" : `${margin.toFixed(1)}%`} · Profit per unit: £{profit.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Suggested sell price at 50% margin: £{suggested.toFixed(2)}</div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Compliance</div>
            <div className="flex items-center justify-between">
              <Label>BS EN 1303 compliant</Label>
              <Switch checked={p.bs_en_1303} onCheckedChange={v => upd("bs_en_1303", v)} />
            </div>
            <div><Label>Security rating</Label><Input value={p.security_rating ?? ""} onChange={e => upd("security_rating", e.target.value)} /></div>
          </section>

          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Product image</div>
            {p.image_url ? (
              <div className="flex items-center gap-3">
                <img src={p.image_url} alt="" className="h-20 w-20 rounded object-cover border" />
                <button onClick={() => upd("image_url", null)} className="text-xs text-red-600 hover:underline inline-flex items-center gap-1"><X className="h-3 w-3" /> Remove image</button>
              </div>
            ) : (
              <div className="rounded border-2 border-dashed p-6 text-center">
                <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-2">JPG, PNG, WebP, SVG up to 5MB</p>
                <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? "Uploading…" : "Choose image"}
                </Button>
              </div>
            )}
            <input
              ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 5_242_880) { toast.error("Max 5MB"); return; } onUpload(f); } e.target.value = ""; }}
            />
          </section>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {!p.id && <Button variant="secondary" disabled={saving} onClick={() => save(true)}>Save & add another</Button>}
          <Button disabled={saving} onClick={() => save(false)} className="bg-primary hover:bg-primary/90">{saving ? "Saving…" : "Save"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const CSV_HEADERS = ["name","code","cylinder_type","pin_count","finish","size","cost_price","price_gbp","description","bs_en_1303"];

function CsvImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (b: boolean) => void; onDone: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const csv = Papa.unparse([CSV_HEADERS, ["Example Cylinder","EX-12","Double","6","Satin Nickel","35/35","18.50","42.00","","true"]]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "products-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = (file: File) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => setRows(res.data as any[]),
    });
  };

  const doImport = async () => {
    setBusy(true);
    let inserted = 0, updated = 0, errors = 0;
    for (const r of rows) {
      const payload: any = {
        name: r.name, code: r.code, cylinder_type: r.cylinder_type,
        pin_count: Number(r.pin_count) || 6, finish: r.finish, size: r.size,
        cost_price: r.cost_price ? Number(r.cost_price) : null,
        price_gbp: Number(r.price_gbp) || 0,
        description: r.description || null,
        bs_en_1303: String(r.bs_en_1303).toLowerCase() === "true",
        is_active: true,
      };
      const { data: existing } = await supabase.from("products").select("id").eq("code", r.code).maybeSingle();
      if (existing?.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", existing.id);
        if (error) errors++; else updated++;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) errors++; else inserted++;
      }
    }
    setBusy(false);
    toast.success(`${inserted} imported, ${updated} updated, ${errors} errors`);
    setRows([]); onOpenChange(false); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import products from CSV</DialogTitle>
          <DialogDescription>Upsert by product code. Existing codes are updated.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}><FileDown className="h-4 w-4" /> Download template</Button>
            <Input type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          </div>
          {rows.length > 0 && (
            <div className="max-h-72 overflow-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-muted/40"><tr>{CSV_HEADERS.map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
                <tbody>{rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t">{CSV_HEADERS.map(h => <td key={h} className="px-2 py-1">{r[h]}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={busy || rows.length === 0} onClick={doImport} className="bg-primary hover:bg-primary/90">
            {busy ? "Importing…" : `Import ${rows.length} products`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
