"use client";

import { useActionState } from "react";
import { saveSite } from "@/app/admin/actions";
import { EDITABLE_SITE_FIELDS, type SiteConfig } from "@/content/site";
import { FormMessage, SubmitButton } from "./FormParts";
import styles from "./admin.module.css";

const GROUPS = [
  { title: "Главная и подвал", keys: ["heroLead", "footerTagline"] },
  { title: "Телефоны и мессенджеры", keys: ["phone", "mobile", "whatsappUrl", "telegramUrl"] },
  { title: "Arsh Live — кружочек на главной", keys: ["liveChannelUrl", "liveText"] },
  { title: "Соцсети", keys: ["vkUrl", "instagramUrl", "telegramChannel"] },
  { title: "Страница отзывов /otziv", keys: ["reviewYandexUrl", "review2gisUrl", "reviewVkUrl", "reviewAvitoUrl"] },
  { title: "Адрес и часы", keys: ["address", "hours", "region"] },
  { title: "Заказ с мангала", keys: ["orderMinSum", "deliveryNearPrice", "deliveryFarPrice"] },
  { title: "Поисковики", keys: ["description"] },
  { title: "Реквизиты для документов", keys: ["legalName", "legalInn", "legalOgrnip", "legalAddress", "legalEmail", "siteUrl"] },
] as const;

export function SiteForm({ site, disabled }: { site: SiteConfig; disabled: boolean }) {
  const [state, formAction] = useActionState(saveSite, null);

  return (
    <form action={formAction} className={styles.main} style={{ paddingBlock: 0 }}>
      {GROUPS.map((group) => (
        <fieldset key={group.title} className={styles.card} disabled={disabled}>
          <legend className={styles.cardTitle} style={{ float: "left", width: "100%" }}>
            {group.title}
          </legend>
          <div className={styles.grid2}>
            {group.keys.map((key) => {
              const fieldInfo = EDITABLE_SITE_FIELDS.find((item) => item.key === key);
              if (!fieldInfo) return null;
              const value = site[fieldInfo.key] ?? "";
              const id = `site-${fieldInfo.key}`;
              return (
                <label key={key} className={`${styles.field} ${fieldInfo.kind === "textarea" ? styles.wide : ""}`} htmlFor={id}>
                  <span className={styles.label}>{fieldInfo.label}</span>
                  {fieldInfo.kind === "textarea" ? (
                    <textarea id={id} name={fieldInfo.key} defaultValue={value} className={`${styles.input} ${styles.textarea}`} maxLength={300} />
                  ) : (
                    <input
                      id={id}
                      name={fieldInfo.key}
                      defaultValue={value}
                      className={styles.input}
                      type={fieldInfo.kind === "url" ? "url" : fieldInfo.kind === "tel" ? "tel" : "text"}
                      inputMode={fieldInfo.kind === "tel" ? "tel" : undefined}
                      maxLength={300}
                    />
                  )}
                  {fieldInfo.hint ? <span className={styles.hint}>{fieldInfo.hint}</span> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className={styles.actions}>
        <SubmitButton>Сохранить</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
