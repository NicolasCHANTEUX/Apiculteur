import type { Metadata } from "next";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { Notice } from "@/components/admin/admin-ui";
import { CommandTrigger } from "@/components/admin/command-palette";
import { DonutChart } from "@/components/admin/dashboard/donut-chart";
import { categoryColors, statusColors } from "@/components/admin/dashboard/palette";
import { Trends } from "@/components/admin/dashboard/trends";
import { DashCard, Honeycomb, ReadinessRing, StockHealth } from "@/components/admin/dashboard/widgets";
import { formatPrice } from "@/components/catalog/product-display";
import {
  AlertTriangleIcon,
  ArchiveIcon,
  ArrowRightIcon,
  CircleCheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  HistoryIcon,
  ImageIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShoppingBagIcon,
  InboxIcon,
  SparklesIcon,
  StarFilledIcon,
  StarIcon,
  TagIcon,
  TrashIcon,
} from "@/components/icons";
import { getActivitySeries, getRecentActivity } from "@/data/admin/activity";
import { SERIES_DAYS, getDashboardData } from "@/data/admin/dashboard";
import { getLaunchChecks } from "@/data/admin/launch-status";
import { getPublishedLegal } from "@/data/legal";
import { countNewRequests } from "@/data/admin/requests";
import { getDeliverySettings, getOrderSettings } from "@/data/settings";
import { requireAdmin } from "@/data/auth";
import { formatRelativeTime } from "@/lib/admin/audit-labels";
import { lastDays } from "@/lib/admin/series";
import { formatOrderDate, fulfillmentLabels, validationLabels } from "@/lib/orders/labels";

export const metadata: Metadata = { title: "Tableau de bord" };

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" }).format(now));
  if (hour < 6) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

function today(now: Date) {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(now);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function Shortcut({
  href,
  icon: IconComponent,
  title,
  caption,
  badge,
  featured = false,
  external = false,
  delay,
}: {
  href: string;
  icon: Icon;
  title: string;
  caption: string;
  badge?: number;
  featured?: boolean;
  external?: boolean;
  delay: number;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener" : undefined}
      className={`group relative flex flex-col overflow-hidden rounded-2xl p-4 transition duration-300 hover:-translate-y-1 motion-safe:animate-[rise_.6s_cubic-bezier(.2,.7,.2,1)_both] ${
        featured
          ? "bg-gradient-to-br from-[#e6ad45] via-honey to-[#b9791a] text-white shadow-[0_16px_36px_-18px_rgb(217_154_43/0.9)] hover:shadow-[0_22px_44px_-18px_rgb(217_154_43/1)]"
          : "border border-line/70 bg-white text-ink shadow-[0_1px_2px_rgb(61_43_26/0.04)] hover:border-honey/50 hover:shadow-[0_18px_40px_-24px_rgb(61_43_26/0.45)]"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className={`flex size-10 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110 group-hover:-rotate-6 ${
          featured ? "bg-white/20 text-white ring-1 ring-white/30" : "bg-gradient-to-br from-honey/15 to-honey/5 text-honey-dark ring-1 ring-honey/15"
        }`}
      >
        <IconComponent className="size-5" />
      </span>
      <span className="mt-4 text-[14.5px] leading-snug font-semibold">{title}</span>
      <span className={`mt-0.5 text-[12.5px] ${featured ? "text-white/80" : "text-muted"}`}>{caption}</span>
      {badge ? (
        <span
          className={`absolute top-4 right-4 flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11.5px] font-bold ${
            featured ? "bg-white text-honey-dark" : "bg-espresso text-white"
          }`}
        >
          {badge}
        </span>
      ) : null}
      <ArrowRightIcon
        className={`absolute right-4 bottom-4 size-4 -translate-x-1 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${
          featured ? "text-white" : "text-honey-dark"
        }`}
      />
    </Link>
  );
}

function StatTile({
  label,
  icon: IconComponent,
  value,
  unit,
  footer,
  attention = false,
  href,
  delay,
}: {
  label: string;
  icon: Icon;
  value: ReactNode;
  unit?: string;
  footer: ReactNode;
  attention?: boolean;
  href?: string;
  delay: number;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-body">{label}</p>
        <span className={`flex size-8 items-center justify-center rounded-lg ${attention ? "bg-honey text-white" : "bg-sand text-brown"}`}>
          <IconComponent className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-[30px] leading-none font-semibold text-ink">
        {value}
        {unit ? <span className="ml-1.5 text-[14px] font-normal text-muted">{unit}</span> : null}
      </p>
      <div className="mt-4">{footer}</div>
    </>
  );
  const className = `group block rounded-2xl border p-5 transition duration-300 motion-safe:animate-[rise_.7s_cubic-bezier(.2,.7,.2,1)_both] ${
    attention
      ? "border-honey/45 bg-gradient-to-br from-white via-white to-honey/10 shadow-[0_14px_32px_-22px_rgb(217_154_43/0.8)]"
      : "border-line/70 bg-white shadow-[0_1px_2px_rgb(61_43_26/0.04)]"
  } ${href ? "hover:-translate-y-0.5 hover:border-honey/50 hover:shadow-[0_18px_40px_-24px_rgb(61_43_26/0.45)]" : ""}`;
  return href ? (
    <Link href={href} className={className} style={{ animationDelay: `${delay}ms` }}>
      {content}
    </Link>
  ) : (
    <div className={className} style={{ animationDelay: `${delay}ms` }}>
      {content}
    </div>
  );
}

/** Barre segmentée (parts d'un tout) avec sa légende chiffrée. */
function SegmentBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-sand">
        {parts
          .filter((part) => part.value > 0)
          .map((part, index) => (
            <span
              key={part.label}
              className="h-full origin-left first:rounded-l-full last:rounded-r-full motion-safe:animate-[grow-x_.9s_cubic-bezier(.2,.7,.2,1)_both]"
              style={{ width: `${(part.value / Math.max(total, 1)) * 100}%`, background: part.color, animationDelay: `${300 + index * 80}ms` }}
              title={`${part.label} : ${part.value}`}
            />
          ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
        {parts.map((part) => (
          <li key={part.label} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: part.color }} aria-hidden />
            {part.label} <span className="font-medium text-ink tabular-nums">{part.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const activityIcons: [string, Icon][] = [
  ["product.stock", PackageIcon],
  ["product.image", ImageIcon],
  ["product.status", EyeIcon],
  ["product.created", PlusIcon],
  ["product.duplicated", CopyIcon],
  ["product.deleted", TrashIcon],
  ["category", TagIcon],
];

type Todo = { key: string; icon: Icon; tone: "critical" | "warning" | "honey" | "neutral"; title: string; detail?: string; href?: string; cta?: string };

const todoTones = {
  critical: "bg-red-50 text-red-600 ring-red-100",
  warning: "bg-orange-50 text-orange-600 ring-orange-100",
  honey: "bg-honey/12 text-honey-dark ring-honey/15",
  neutral: "bg-sand text-brown ring-line/60",
};

function names(items: { name: string }[], max = 3) {
  const shown = items.slice(0, max).map((item) => item.name).join(", ");
  return items.length > max ? `${shown} et ${items.length - max} autre${items.length - max > 1 ? "s" : ""}` : shown;
}

export default async function AdminDashboardPage(props: PageProps<"/admin">) {
  await requireAdmin("/admin");
  const now = new Date();
  const days = lastDays(SERIES_DAYS, now);
  const [data, activity, actionSeries, params, newRequests] = await Promise.all([
    getDashboardData(days),
    getRecentActivity(6),
    getActivitySeries(days),
    props.searchParams,
    countNewRequests(),
  ]);
  const [orderSettings, legal, delivery] = await Promise.all([getOrderSettings(), getPublishedLegal(), getDeliverySettings()]);
  const checks = getLaunchChecks({
    ordersOpen: orderSettings.ordersOpen,
    legalVersion: legal?.version ?? null,
    originLocated: delivery.origin?.latitude != null,
  });
  const configChecks = checks.filter((check) => check.state !== "later");
  const configured = configChecks.filter((check) => check.state === "ok").length;
  const stockAlerts = data.lowStock.length + data.outOfStock.length;
  const stockLevels = {
    ok: data.stock.items.filter((item) => item.level === "ok").length,
    low: data.stock.items.filter((item) => item.level === "low").length,
    out: data.stock.items.filter((item) => item.level === "out").length,
  };

  // Phrase d'accueil : l'essentiel en une ligne.
  const highlights: ReactNode[] = [
    <strong key="online" className="font-semibold text-white">{plural(data.products.published, "produit en ligne", "produits en ligne")}</strong>,
  ];
  if (stockAlerts) highlights.push(<strong key="stock" className="font-semibold text-[#f6d27a]">{plural(stockAlerts, "alerte de stock", "alertes de stock")}</strong>);
  if (data.ordersToValidate) highlights.push(<strong key="orders" className="font-semibold text-[#f6d27a]">{plural(data.ordersToValidate, "commande à valider", "commandes à valider")}</strong>);
  if (newRequests) highlights.push(<strong key="requests" className="font-semibold text-[#f6d27a]">{plural(newRequests, "nouvelle demande", "nouvelles demandes")}</strong>);
  if (data.reviewsPending) highlights.push(<strong key="reviews" className="font-semibold text-white">{plural(data.reviewsPending, "avis à modérer", "avis à modérer")}</strong>);
  const sentence = highlights.flatMap((part, index) => (index === 0 ? [part] : [index === highlights.length - 1 ? " et " : ", ", part]));

  const todos: Todo[] = [];
  if (data.ordersToValidate > 0) {
    todos.push({ key: "orders", icon: ShoppingBagIcon, tone: "honey", title: `${plural(data.ordersToValidate, "commande attend", "commandes attendent")} votre validation`, detail: "Acceptez ou refusez-les depuis la rubrique Commandes.", href: "/admin/commandes?statut=a-valider", cta: "Traiter" });
  }
  if (newRequests > 0) {
    todos.push({ key: "requests", icon: InboxIcon, tone: "honey", title: `${plural(newRequests, "nouvelle demande", "nouvelles demandes")} dans la boîte de réception`, detail: "Questions, devis et essaims signalés depuis la page contact.", href: "/admin/demandes", cta: "Lire" });
  }
  if (data.reviewsPending > 0) {
    todos.push({ key: "reviews", icon: StarIcon, tone: "honey", title: `${plural(data.reviewsPending, "avis", "avis")} à modérer`, detail: "Invisibles tant que vous ne les avez pas acceptés.", href: "/admin/avis", cta: "Voir" });
  }
  if (data.outOfStock.length > 0) {
    todos.push({ key: "out", icon: AlertTriangleIcon, tone: "critical", title: `${plural(data.outOfStock.length, "produit en ligne est", "produits en ligne sont")} en rupture`, detail: names(data.outOfStock), href: "/admin/produits?statut=published&stock=rupture", cta: "Réapprovisionner" });
  }
  if (data.lowStock.length > 0) {
    todos.push({
      key: "low",
      icon: AlertTriangleIcon,
      tone: "warning",
      title: `${plural(data.lowStock.length, "produit", "produits")} sous le seuil d’alerte`,
      detail: data.lowStock.slice(0, 3).map((product) => `${product.name} (${product.stock} restant${product.stock > 1 ? "s" : ""})`).join(", "),
      href: "/admin/produits?stock=faible",
      cta: "Voir le stock",
    });
  }
  if (data.withoutPhoto.length > 0) {
    todos.push({
      key: "photos",
      icon: ImageIcon,
      tone: "neutral",
      title: `${plural(data.withoutPhoto.length, "produit n’a", "produits n’ont")} pas de photo`,
      detail: names(data.withoutPhoto),
      href: data.withoutPhoto.length === 1 ? `/admin/produits/${data.withoutPhoto[0].id}#photos` : "/admin/produits",
      cta: "Ajouter des photos",
    });
  }
  if (data.products.drafts > 0) {
    todos.push({ key: "drafts", icon: PencilIcon, tone: "neutral", title: `${plural(data.products.drafts, "brouillon", "brouillons")} à terminer`, detail: "Invisibles sur le site tant qu’ils ne sont pas publiés.", href: "/admin/produits?statut=draft", cta: "Voir les brouillons" });
  }

  const weakest = data.readiness.weakest[0];

  return (
    <main className="space-y-8">
      {params["mot-de-passe"] === "modifie" ? <Notice tone="success">Votre mot de passe a été modifié.</Notice> : null}

      {/* Bandeau d'accueil ------------------------------------------------ */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-espresso text-white shadow-[0_30px_60px_-30px_rgb(61_43_26/0.8)] motion-safe:animate-[rise_.7s_cubic-bezier(.2,.7,.2,1)_both]">
        <div className="absolute -top-28 -right-20 -z-10 size-96 rounded-full bg-honey/35 blur-3xl motion-safe:animate-[glow_10s_ease-in-out_infinite_alternate]" aria-hidden />
        <div className="absolute -bottom-40 left-1/4 -z-10 size-80 rounded-full bg-[#cf5b2e]/25 blur-3xl motion-safe:animate-[glow_14s_ease-in-out_infinite_alternate-reverse]" aria-hidden />
        <Honeycomb />
        <div className="relative grid grid-cols-[minmax(0,1fr)] gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-10">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12.5px] text-white/80 ring-1 ring-white/15 backdrop-blur-sm">
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-green-400 motion-safe:animate-ping" aria-hidden />
                <span className="relative size-2 rounded-full bg-green-400" />
              </span>
              {today(now)}
            </p>
            <h1 className="mt-5 font-display text-[38px] leading-[1.05] font-medium sm:text-[50px]">
              {greeting(now)}
              <span className="text-honey">.</span>
            </h1>
            <p className="mt-3 max-w-[560px] text-[15.5px] leading-[1.6] text-white/70">
              Votre boutique compte {sentence}.
              {!stockAlerts && !data.ordersToValidate && !newRequests && !data.reviewsPending ? " Tout est calme au rucher." : ""}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <CommandTrigger className="group flex min-h-12 w-full items-center gap-3 rounded-xl bg-white/10 px-4 text-left text-[14px] text-white/65 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/15 hover:text-white hover:ring-white/30 sm:max-w-[380px]">
                <SearchIcon className="size-[18px] text-honey" />
                <span className="min-w-0 flex-1 truncate">Rechercher un produit, une page…</span>
                <kbd className="hidden rounded-md sm:inline bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-white/60 ring-1 ring-white/15">Ctrl K</kbd>
              </CommandTrigger>
              <Link
                href="/admin/produits/nouveau"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-honey px-5 text-[14px] font-semibold text-white shadow-[0_10px_30px_-10px_rgb(217_154_43/0.9)] transition hover:bg-[#e6ad45]"
              >
                <PlusIcon className="size-4" />
                Nouveau produit
              </Link>
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-center gap-4 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur-md sm:flex-row sm:gap-6 lg:flex-col lg:items-stretch lg:gap-4 lg:p-6">
            <ReadinessRing score={data.readiness.score} />
            <div className="w-full min-w-0 sm:flex-1 lg:max-w-[180px]">
              <p className="text-[13px] text-white/75">
                <span className="font-semibold text-white">{data.readiness.complete}</span> fiche{data.readiness.complete > 1 ? "s" : ""} prête{data.readiness.complete > 1 ? "s" : ""} sur {data.readiness.total}
              </p>
              {weakest ? (
                <Link href={`/admin/produits/${weakest.id}`} className="group mt-2 block rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10 transition hover:bg-white/10">
                  <span className="flex items-center gap-1.5 text-[11.5px] font-medium tracking-[0.06em] text-[#f6d27a] uppercase">
                    <SparklesIcon className="size-3.5" /> À compléter
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-white">{weakest.name}</span>
                  <span className="block truncate text-[11.5px] text-white/55">{weakest.missing.join(", ")}</span>
                </Link>
              ) : (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-green-300">
                  <CircleCheckIcon className="size-4" /> Toutes les fiches sont complètes
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Accès rapides ---------------------------------------------------- */}
      <nav aria-label="Accès rapides" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Shortcut href="/admin/produits/nouveau" icon={PlusIcon} title="Nouveau produit" caption="Créer une fiche" featured delay={80} />
        <Shortcut
          href={data.outOfStock.length ? "/admin/produits?stock=rupture" : "/admin/produits?stock=faible"}
          icon={PackageIcon}
          title="Stock"
          caption={stockAlerts ? "Alertes à traiter" : "Ajuster les quantités"}
          badge={stockAlerts}
          delay={130}
        />
        <Shortcut
          href={data.withoutPhoto.length ? `/admin/produits/${data.withoutPhoto[0].id}#photos` : "/admin/produits"}
          icon={ImageIcon}
          title="Photos"
          caption={data.withoutPhoto.length ? "Fiches sans photo" : "Toutes illustrées"}
          badge={data.withoutPhoto.length}
          delay={180}
        />
        <Shortcut href="/admin/produits?statut=draft" icon={PencilIcon} title="Brouillons" caption="À terminer et publier" badge={data.products.drafts} delay={230} />
        <Shortcut href="/admin/categories" icon={TagIcon} title="Catégories" caption={plural(data.categories.length, "catégorie utilisée", "catégories utilisées")} delay={280} />
        <Shortcut href="/" icon={ExternalLinkIcon} title="La boutique" caption="Voir le site public" external delay={330} />
      </nav>

      {/* État de la boutique --------------------------------------------- */}
      <section aria-label="État de la boutique" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Produits en ligne"
          icon={PackageIcon}
          value={data.products.published}
          unit={`/ ${data.products.total}`}
          href="/admin/produits?statut=published"
          delay={120}
          footer={
            <SegmentBar
              parts={[
                { label: "En ligne", value: data.products.published, color: categoryColors[0] },
                { label: "Brouillons", value: data.products.drafts, color: categoryColors[1] },
                { label: "Masqués", value: data.products.hidden, color: categoryColors[2] },
                { label: "Épuisés", value: data.products.soldOut, color: categoryColors[3] },
              ]}
            />
          }
        />
        <StatTile
          label="Unités en stock"
          icon={ArchiveIcon}
          value={data.stock.units.toLocaleString("fr-FR")}
          attention={stockAlerts > 0}
          href={stockAlerts ? "/admin/produits?stock=faible" : "/admin/produits"}
          delay={180}
          footer={
            <>
              <p className="mb-2.5 text-[12.5px] text-muted">
                Valeur estimée <span className="font-semibold text-ink">{euros.format(data.stock.value)}</span>
              </p>
              <SegmentBar
                parts={[
                  { label: "OK", value: stockLevels.ok, color: statusColors.good },
                  { label: "Faible", value: stockLevels.low, color: statusColors.warning },
                  { label: "Rupture", value: stockLevels.out, color: statusColors.critical },
                ]}
              />
            </>
          }
        />
        <StatTile
          label="Commandes à valider"
          icon={ShoppingBagIcon}
          value={data.ordersToValidate}
          attention={data.ordersToValidate > 0}
          href="/admin/commandes?statut=a-valider"
          delay={240}
          footer={
            <p className="text-[12.5px] text-muted">
              <span className="font-semibold text-ink">{data.ordersToProcess}</span> en cours de préparation
            </p>
          }
        />
        <StatTile
          label="Avis clients"
          icon={StarIcon}
          value={data.reviews.average === null ? "—" : data.reviews.average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
          unit={data.reviews.average === null ? undefined : "/ 5"}
          attention={data.reviewsPending > 0}
          delay={300}
          footer={
            <div className="flex items-center justify-between gap-3 text-[12.5px] text-muted">
              <span className="flex" aria-hidden>
                {Array.from({ length: 5 }, (_, index) => (
                  <StarFilledIcon
                    key={index}
                    className={`size-4 ${data.reviews.average !== null && index < Math.round(data.reviews.average) ? "text-honey" : "text-line"}`}
                  />
                ))}
              </span>
              <span>
                {plural(data.reviews.count, "avis publié", "avis publiés")}
                {data.reviewsPending ? ` · ${data.reviewsPending} en attente` : ""}
              </span>
            </div>
          }
        />
      </section>

      {/* Tendances (client : période, indicateur, survol) ------------------ */}
      <Trends
        days={data.series.days}
        orders={data.series.orders}
        revenue={data.series.revenue}
        actions={actionSeries}
        generatedAt={now.toISOString()}
      />

      {/* Catalogue et stock ----------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashCard
          title="Catalogue par catégorie"
          subtitle="Produits non archivés"
          action={<Link href="/admin/categories" className="text-[13px] font-medium text-honey-dark hover:underline">Gérer</Link>}
          delay={100}
        >
          {data.categories.length ? (
            <DonutChart slices={data.categories} unit={["produit", "produits"]} />
          ) : (
            <p className="py-10 text-center text-[13.5px] text-muted">Aucun produit pour le moment.</p>
          )}
        </DashCard>
        <DashCard
          title="Santé du stock"
          subtitle="Produits en ligne ou masqués, les plus urgents d’abord"
          action={<Link href="/admin/produits" className="text-[13px] font-medium text-honey-dark hover:underline">Tout voir</Link>}
          delay={180}
        >
          {data.stock.items.length ? (
            <StockHealth items={data.stock.items} />
          ) : (
            <p className="py-10 text-center text-[13.5px] text-muted">Aucun produit en ligne.</p>
          )}
        </DashCard>
      </div>

      {/* À faire et activité ---------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <DashCard title="À faire" subtitle="Ce qui mérite votre attention aujourd’hui" delay={100}>
          {todos.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                <CircleCheckIcon className="size-6" />
              </span>
              <p className="mt-3 font-display text-[17px] font-semibold text-ink">Rien d’urgent</p>
              <p className="mt-1 text-[13px] text-muted">Fiches illustrées, stock au-dessus des seuils, aucune demande en attente.</p>
            </div>
          ) : (
            <ul className="-mx-2 space-y-1">
              {todos.map((todo) => {
                const TodoIcon = todo.icon;
                const body = (
                  <>
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${todoTones[todo.tone]}`}>
                      <TodoIcon className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink">{todo.title}</span>
                      {todo.detail ? <span className="mt-0.5 block line-clamp-1 text-[12.5px] text-muted">{todo.detail}</span> : null}
                    </span>
                    {todo.cta ? (
                      <span className="hidden shrink-0 items-center gap-1 text-[12.5px] font-medium text-honey-dark sm:inline-flex">
                        {todo.cta}
                        <ArrowRightIcon className="size-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    ) : null}
                  </>
                );
                return (
                  <li key={todo.key}>
                    {todo.href ? (
                      <Link href={todo.href} className="group flex items-center gap-3.5 rounded-xl px-2 py-2.5 transition hover:bg-cream">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3.5 px-2 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DashCard>

        <DashCard title="Activité récente" subtitle="Vos dernières modifications" delay={180}>
          {activity === null ? (
            <p className="py-6 text-[13.5px] text-muted">Le journal d’activité est momentanément indisponible.</p>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-[13px] text-muted">
              <HistoryIcon className="size-6 text-parchment" />
              <p className="mt-2">Vos modifications du catalogue s’afficheront ici.</p>
            </div>
          ) : (
            <ol className="space-y-0">
              {activity.map((entry, index) => {
                const EntryIcon = activityIcons.find(([prefix]) => entry.action.startsWith(prefix))?.[1] ?? PencilIcon;
                return (
                  <li key={entry.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                    {index < activity.length - 1 ? <span className="absolute top-9 bottom-0 left-[15px] w-px bg-line" aria-hidden /> : null}
                    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-cream text-honey-dark ring-1 ring-line">
                      <EntryIcon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5 text-[13px] leading-[1.45]">
                      <p className="text-ink">
                        {entry.subject ? (
                          entry.href ? (
                            <Link href={entry.href} className="font-medium hover:text-honey-dark">{entry.subject}</Link>
                          ) : (
                            <span className="font-medium">{entry.subject}</span>
                          )
                        ) : null}
                        {entry.subject ? <span className="text-muted"> · </span> : null}
                        <span className={entry.subject ? "text-body" : "text-ink"}>{entry.label}</span>
                      </p>
                      <p className="text-[12px] text-muted">
                        <time dateTime={entry.createdAt} title={formatOrderDate(entry.createdAt)}>
                          {formatRelativeTime(entry.createdAt, now)}
                        </time>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </DashCard>
      </div>

      {/* Commandes et mise en service ------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <DashCard title="Dernières commandes" delay={100}>
          {data.latestOrders.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-[13px] text-muted">
              <ShoppingBagIcon className="size-6 text-parchment" />
              <p className="mt-2">Les demandes passées sur le site apparaîtront ici dès l’ouverture des commandes.</p>
            </div>
          ) : (
            <ul className="-mx-2 divide-y divide-line/60">
              {data.latestOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/commandes/${order.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-3 text-[13.5px] transition hover:bg-cream">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-sand text-[13px] font-semibold text-brown uppercase" aria-hidden>
                      {order.customerName?.charAt(0) ?? "?"}
                    </span>
                    <div>
                      <p className="font-medium text-ink">
                        {order.customerName ?? "Client"}
                        <span className="font-normal text-muted"> · {order.orderNumber}</span>
                      </p>
                      <p className="text-[12px] text-muted">{formatOrderDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                        order.validationStatus === "pending" ? "bg-honey/15 text-honey-dark" : "bg-sand text-brown"
                      }`}
                    >
                      {order.validationStatus === "pending" ? validationLabels.pending : fulfillmentLabels[order.fulfillmentStatus]}
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{formatPrice(order.totalAmount)}</span>
                  </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashCard>

        <DashCard title="Mise en service" subtitle="Réglages techniques du site" delay={180}>
          <div className="flex items-center justify-between gap-3 text-[13.5px] text-body">
            <span>
              {configured === configChecks.length
                ? "Configuration complète."
                : `${plural(configChecks.length - configured, "réglage", "réglages")} à faire.`}
            </span>
            <span className="text-[12.5px] font-medium text-muted tabular-nums">{configured}/{configChecks.length}</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sand">
            <div
              className="h-full origin-left rounded-full bg-gradient-to-r from-honey to-[#e6ad45] motion-safe:animate-[grow-x_1s_cubic-bezier(.2,.7,.2,1)_.3s_both]"
              style={{ width: `${configChecks.length ? (configured / configChecks.length) * 100 : 0}%` }}
            />
          </div>
          <details className="group mt-4">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-honey-dark">
              <ArrowRightIcon className="size-3.5 transition group-open:rotate-90" />
              Détail et fonctions à venir
            </summary>
            <ul className="mt-3 space-y-2.5">
              {checks.map((check) => (
                <li key={check.label} className="flex items-start justify-between gap-3 text-[13px]">
                  <div>
                    <p className="text-ink">{check.label}</p>
                    <p className="text-[12px] text-muted">{check.detail}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ring-1 ring-inset ${
                      check.state === "ok"
                        ? "bg-green-50 text-green-800 ring-green-200"
                        : check.state === "todo"
                          ? "bg-orange-50 text-orange-800 ring-orange-200"
                          : "bg-sand text-muted ring-line"
                    }`}
                  >
                    {check.state === "ok" ? "OK" : check.state === "todo" ? "À configurer" : "À venir"}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </DashCard>
      </div>
    </main>
  );
}
