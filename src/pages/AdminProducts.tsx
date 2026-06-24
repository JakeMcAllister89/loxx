import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowUpDown, Upload, FileDown, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

export interface AdminProduct {
  id?: string;
  name: string;
  code: string;
  cylinder_type: string;
  cylinder_profile: string | null;
  finish: string;
  size: string;
  price_gbp: number;
  cost_price: number | null;
  product_description: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

interface CylinderType { id: string; name: string; sort_order: number; is_active: boolean; }

const blank = (defaultType = "Double"): AdminProduct => ({
  name: "", code: "", cylinder_type: defaultType, cylinder_profile: "Euro", finish: "Satin Nickel",
  size: "35/35", price_gbp: 0, cost_price: 0, product_description: "", description: "",
  image_url: null, is_active: true,
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
  const [types, setTypes] = useState<CylinderType[]>([]);
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
  const loadTypes = async () => {
    const { data } = await supabase.from("cylinder_types").select("*").eq("is_active", true).order("sort_order");
    setTypes((data ?? []) as any);
  };
  useEffect(() => { load(); loadTypes(); }, []);

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

  const openNew = () => { setEditing(blank(types[0]?.name ?? "Double")); setDrawerOpen(true); };
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
                  ["cylinder_profile","Lock function"],
                  ["cost_price","Cost"],["price_gbp","Sell"],
                ] as [keyof AdminProduct, string][]).map(([k,l]) => (
                  <th key={k} className="px-3 py-2 text-left">
                    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {l} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-left">Margin</th>
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
                    <td className="px-3 py-2 font-medium">{p.product_description ?? p.name}{!p.is_active && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.code}</td>
                    <td className="px-3 py-2"><Badge variant="outline">{p.cylinder_type}</Badge></td>
                    <td className="px-3 py-2">{p.finish}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.size}</td>
                    <td className="px-3 py-2 text-xs">{p.cylinder_profile ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 font-mono text-green-700">£{Number(p.cost_price ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2 font-mono font-semibold">£{Number(p.price_gbp).toFixed(2)}</td>
                    <td className={`px-3 py-2 font-mono ${m == null ? "text-muted-foreground" : marginColor(m)}`}>{m == null ? "—" : `${m.toFixed(1)}%`}</td>
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

        <CylinderTypesSection types={types} reload={loadTypes} products={products} />
      </div>

      <ProductDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        product={editing}
        types={types}
        onSaved={() => { setDrawerOpen(false); load(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.product_description ?? deleteTarget?.name}?</AlertDialogTitle>
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

function ProductDrawer({ open, onOpenChange, product, types, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void; product: AdminProduct | null; types: CylinderType[]; onSaved: () => void;
}) {
  const [p, setP] = useState<AdminProduct>(product ?? blank(types[0]?.name ?? "Double"));
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
    if (!p.product_description || !p.code) { toast.error("Product description and code required"); return; }
    setSaving(true);
    const derivedName = (p.product_description ?? "").slice(0, 80) || p.code;
    const payload: any = {
      name: derivedName,
      code: p.code, cylinder_type: p.cylinder_type, cylinder_profile: p.cylinder_profile,
      pin_count: 6,
      finish: p.finish, size: p.size, price_gbp: p.price_gbp, cost_price: p.cost_price,
      product_description: p.product_description,
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
    if (addAnother) { setP(blank(types[0]?.name ?? "Double")); return; }
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
            <div>
              <Label>Product description *</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Double cylinder, keyed both sides, suitable for doors requiring key access from both sides"
                value={p.product_description ?? ""}
                onChange={e => upd("product_description", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Appears on the catalogue, order confirmations and purchase orders</p>
            </div>
            <div><Label>Product code *</Label><Input className="font-mono" placeholder="e.g. EKZ-12" value={p.code} onChange={e => upd("code", e.target.value)} /></div>
          </section>

          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Classification</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cylinder type</Label>
                <Select value={p.cylinder_type} onValueChange={v => upd("cylinder_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Size</Label><Input placeholder="e.g. 35/35" value={p.size} onChange={e => upd("size", e.target.value)} /></div>
              <div>
                <Label>Cylinder profile</Label>
                <Input placeholder="e.g. Euro, Oval, Rim, Mortice" value={p.cylinder_profile ?? ""} onChange={e => upd("cylinder_profile", e.target.value || null)} />
              </div>
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

const CSV_HEADERS = ["product_description","code","cylinder_type","finish","size","cost_price","price_gbp"];

function CsvImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (b: boolean) => void; onDone: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const csv = Papa.unparse([CSV_HEADERS, ["Example double cylinder, keyed both sides","EX-12","Double","Satin Nickel","35/35","18.50","42.00"]]);
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
      const desc = r.product_description || "";
      const payload: any = {
        name: (desc || r.code).slice(0, 80),
        code: r.code, cylinder_type: r.cylinder_type,
        pin_count: 6, finish: r.finish, size: r.size,
        cost_price: r.cost_price ? Number(r.cost_price) : null,
        price_gbp: Number(r.price_gbp) || 0,
        product_description: desc || null,
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

function CylinderTypesSection({ types, reload, products }: { types: CylinderType[]; reload: () => void; products: AdminProduct[] }) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const usageCount = (typeName: string) => products.filter(p => p.is_active && p.cylinder_type === typeName).length;

  const add = async () => {
    const n = newName.trim();
    if (!n) return;
    setBusy(true);
    const nextOrder = (types[types.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("cylinder_types").insert({ name: n, sort_order: nextOrder });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setNewName(""); reload();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = types.findIndex(t => t.id === id);
    const swap = types[idx + dir];
    if (!swap) return;
    await supabase.from("cylinder_types").update({ sort_order: swap.sort_order }).eq("id", id);
    await supabase.from("cylinder_types").update({ sort_order: types[idx].sort_order }).eq("id", swap.id);
    reload();
  };

  const saveRename = async (id: string) => {
    const n = editName.trim();
    if (!n) { setEditingId(null); return; }
    const { error } = await supabase.from("cylinder_types").update({ name: n }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditingId(null); reload();
  };

  const remove = async (t: CylinderType) => {
    if (usageCount(t.name) > 0) return;
    const { error } = await supabase.from("cylinder_types").update({ is_active: false }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    reload();
  };

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Cylinder types</h2>
          <p className="text-sm text-muted-foreground">Manage the cylinder type options that appear in the product form and the builder.</p>
        </div>
      </div>
      <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left w-20">Order</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left w-32">Products</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t, i) => {
              const count = usageCount(t.name);
              const canDelete = count === 0;
              return (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => move(t.id, -1)}>↑</Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === types.length - 1} onClick={() => move(t.id, 1)}>↓</Button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {editingId === t.id ? (
                      <Input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onBlur={() => saveRename(t.id)} onKeyDown={e => { if (e.key === "Enter") saveRename(t.id); if (e.key === "Escape") setEditingId(null); }} className="h-8 w-48" />
                    ) : (
                      <span className="font-medium">{t.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{count} product{count === 1 ? "" : "s"}</td>
                  <td className="px-3 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(t.id); setEditName(t.name); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" disabled={!canDelete} title={canDelete ? "Remove" : `${count} products use this type`} onClick={() => remove(t)}>
                      <Trash2 className={`h-3.5 w-3.5 ${canDelete ? "text-red-600" : "text-muted-foreground"}`} />
                    </Button>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t bg-muted/20">
              <td className="px-3 py-2" colSpan={2}>
                <div className="flex gap-2">
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add new type, e.g. Round-key cam" className="h-8 max-w-xs" onKeyDown={e => { if (e.key === "Enter") add(); }} />
                </div>
              </td>
              <td className="px-3 py-2" colSpan={2}>
                <div className="flex justify-end">
                  <Button size="sm" disabled={busy || !newName.trim()} onClick={add} className="bg-primary hover:bg-primary/90"><Plus className="h-3.5 w-3.5" /> Add type</Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
