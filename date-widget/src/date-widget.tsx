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

import { getPublishedDates, PublishedDates } from "./page-versions";

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
  const [publishedDates, setPublishedDates] = useState<PublishedDates | null>(null);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    if (!pageId || !webUrl) {
      return;
    }
    // Si les props changent (page réutilisée sans remontage), repartir d'un état propre.
    setFailed(false);
    setPublishedDates(null);
    let cancelled = false;
    getPublishedDates(webUrl, pageId)
      .then((result) => {
        if (!cancelled) {
          setPublishedDates(result);
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

  if (failed || !publishedDates) {
    return null;
  }

  const currentDay = publishedDates.current ? formatDate(publishedDates.current, contentLanguage) : null;
  if (!currentDay) {
    return null;
  }

  // « Publié le » = N-1, « Mis à jour le » = N (spec phase 3).
  // Même jour affiché → une seule date (une ligne au même jour n'apporte rien).
  const previousDay = publishedDates.previous ? formatDate(publishedDates.previous, contentLanguage) : null;
  if (previousDay && previousDay !== currentDay) {
    return <div>Publié le {previousDay} · Mis à jour le {currentDay}</div>;
  }
  return <div>Publié le {currentDay}</div>;
};
