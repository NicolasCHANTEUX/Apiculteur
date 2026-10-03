// Gestion des accès à l'espace apiculteur (table public.admin_users).
//
//   npm run admin -- check  <email>   lecture seule : compte et droits
//   npm run admin -- grant  <email>   donne les droits à un compte existant
//   npm run admin -- create <email>   crée le compte (sans mot de passe
//                                     connu) puis donne les droits ; choisir
//                                     ensuite son mot de passe via
//                                     « Mot de passe oublié » sur le site
//   npm run admin -- revoke <email>   retire les droits (le compte reste)
//
// Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis
// l'environnement (.env.local). N'affiche jamais de clé ni de mot de passe.

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [command, rawEmail] = process.argv.slice(2);
const email = (rawEmail ?? "").trim().toLowerCase();
const commands = ["check", "grant", "create", "revoke"];

if (!commands.includes(command) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(`Usage : npm run admin -- <${commands.join("|")}> <email>`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (fichier .env.local).",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUser() {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user || data.users.length < 200) return user ?? null;
  }
}

async function isAdmin(userId) {
  const { data, error } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function grant(userId) {
  const { error } = await supabase
    .from("admin_users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

// Pas de process.exit() après des appels réseau : sous Windows, Node peut
// planter en fermant les connexions encore ouvertes. On fixe exitCode.
async function main() {
  let user = await findUser();

  if (command === "create") {
    if (user) {
      console.log("Ce compte existe déjà : utilisez « grant » pour lui donner les droits.");
      return 1;
    }
    // Mot de passe aléatoire jamais affiché ni conservé : l'apiculteur choisit
    // le sien avec « Mot de passe oublié ».
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    await grant(user.id);
    console.log(`Compte créé et autorisé : ${email}.`);
    console.log("Étape suivante : sur le site, « Mot de passe oublié » pour choisir le mot de passe.");
    return 0;
  }

  if (!user) {
    console.log(`Aucun compte Supabase Auth pour ${email}.`);
    return command === "check" ? 0 : 1;
  }

  if (command === "check") {
    console.log(`Compte : ${email} (${user.id})`);
    console.log(`Email confirmé : ${user.email_confirmed_at ? "oui" : "non"}`);
    console.log(`Accès administrateur : ${(await isAdmin(user.id)) ? "oui" : "non"}`);
  } else if (command === "grant") {
    await grant(user.id);
    console.log(`Droits administrateur accordés à ${email}.`);
  } else if (command === "revoke") {
    const { error } = await supabase.from("admin_users").delete().eq("id", user.id);
    if (error) throw error;
    console.log(`Droits administrateur retirés à ${email}.`);
  }
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error("Opération impossible :", error?.message ?? error);
  process.exitCode = 1;
}
