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

export const DateWidget = ({ pageId, webUrl, contentLanguage }: DateWidgetProps): ReactElement => {
  const [dates, setDates] = useState<PageDates | null>(null);
  const [failed, setFailed] = useState<boolean>(false);

  useEffect(() => {
    if (!pageId || !webUrl) {
      return;
    }
    let cancelled = false;
    getPageDates(webUrl, pageId)
      .then((result) => {
        if (!cancelled) {
          setDates(result);
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

  if (failed || !dates) {
    return null;
  }

  // La publication met à jour la page (updatedAt ≈ publishedAt, même jour) :
  // la ligne « Modifié le » n'est informative que si le JOUR afféré diffère.
  let text: string | null = null;
  const publishedDay = dates.publishedAt ? formatDate(dates.publishedAt, contentLanguage) : null;
  const modifiedDay = dates.updatedAt ? formatDate(dates.updatedAt, contentLanguage) : null;
  if (publishedDay) {
    text = `Publié le ${publishedDay}`;
    if (modifiedDay && modifiedDay !== publishedDay) {
      text += ` · Modifié le ${modifiedDay}`;
    }
  } else if (modifiedDay) {
    text = `Modifié le ${modifiedDay}`;
  }

  if (!text) {
    return null;
  }
  return <div>{text}</div>;
};
