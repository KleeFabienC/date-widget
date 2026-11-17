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

  let text: string | null = null;
  if (dates.publishedAt) {
    text = `Publié le ${formatDate(dates.publishedAt, contentLanguage)}`;
    if (dates.updatedAt && new Date(dates.updatedAt) > new Date(dates.publishedAt)) {
      text += ` · Modifié le ${formatDate(dates.updatedAt, contentLanguage)}`;
    }
  } else if (dates.updatedAt) {
    text = `Modifié le ${formatDate(dates.updatedAt, contentLanguage)}`;
  }

  if (!text) {
    return null;
  }
  return <div>{text}</div>;
};
