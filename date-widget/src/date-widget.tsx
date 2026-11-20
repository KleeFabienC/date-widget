/*!
 * Copyright 2026, Staffbase SE and contributors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { ReactElement, useEffect, useState } from "react";

import { getPageDates, PageDates } from "./page-dates";

/**
 * React Component
 */
export interface DateWidgetProps {
  pageId?: string;
  webUrl?: string;
  contentLanguage: string;
}

const formatDate = (iso: string, contentLanguage: string): string =>
  new Date(iso)
    .toLocaleDateString(contentLanguage.replace("_", "-"), { day: "numeric", month: "short", year: "numeric" })
    .replace(/[\u202f\u00a0]/g, " ");

export const DateWidget = ({ pageId, webUrl, contentLanguage }: DateWidgetProps): ReactElement | null => {
  const [pageDates, setPageDates] = useState<PageDates | null>(null);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    if (!pageId || !webUrl) {
      return;
    }
    // Si les props changent (page réutilisée sans remontage), repartir d'un état propre.
    setFailed(false);
    setPageDates(null);
    let cancelled = false;
    getPageDates(webUrl, pageId)
      .then((result) => {
        if (!cancelled) {
          setPageDates(result);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setFailed(true);
          console.warn(`date-widget: ${err.message}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pageId, webUrl]);

  if (failed || !pageDates) {
    return null;
  }

  const createdDay = pageDates.createdAt ? formatDate(pageDates.createdAt, contentLanguage) : null;
  const publishedDay = pageDates.publishedAt ? formatDate(pageDates.publishedAt, contentLanguage) : null;
  if (!publishedDay) {
    return null; // page jamais publiée (ou publishedAt non parseable)
  }
  if (createdDay && createdDay !== publishedDay) {
    return <div>Publié le {createdDay} · Mis à jour le {publishedDay}</div>;
  }
  if (createdDay) {
    return <div>Publié le {publishedDay}</div>; // même jour affiché → une seule date
  }
  return <div>Mis à jour le {publishedDay}</div>; // createdAt absent/malformé
};
