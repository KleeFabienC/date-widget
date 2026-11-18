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

import React from "react";
import ReactDOM from "react-dom/client";

import { BlockFactory, BlockDefinition, ExternalBlockDefinition, BaseBlock } from "widget-sdk";
import { DateWidgetProps, DateWidget } from "./date-widget";
import { resolveInstallationId } from "./installation-id";
import { configurationSchema, uiSchema } from "./configuration-schema";
import icon from "../resources/date-widget.svg";
import pkg from '../package.json'

/**
 * Define which attributes are handled by the widget. This should be also reflected in configuration schema
 */
const widgetAttributes: string[] = [];

/**
 * This factory creates the class which is registered with the tagname in the `custom element registry`
 * Gets the parental class and a set of helper utilities provided by the hosting application.
 */
const factory: BlockFactory = (BaseBlockClass, widgetApi) => {
  /**
   *  <date-widget message="world!"></date-widget>
   */
  return class DateWidgetBlock extends BaseBlockClass implements BaseBlock {
    private _root: ReactDOM.Root | null = null;

    public constructor() {
      super();
    }

    private get props(): DateWidgetProps {
      return {
        pageId: resolveInstallationId(this),
        webUrl: widgetApi.getBranchInformation().webUrl,
        contentLanguage: this.contentLanguage,
      };
    }

    public renderBlock(container: HTMLElement): void {
      this._root ??= ReactDOM.createRoot(container);
      this._root.render(<DateWidget {...this.props} />);
      this.removeCardDecoration();
      this.removeBlockBranding();
    }

    /**
     * La plateforme enveloppe le contenu de tout widget custom dans une carte
     * (div.widget-card : ombré, arrondis, fond, padding). Ce widget n'affiche
     * que des dates : on retire l'habillage de la carte qui nous entoure.
     * Override inline scopé à notre propre élément — si la plateforme change
     * sa structure, la carte réapparaît simplement (pas d'erreur).
     */
    private removeCardDecoration(): void {
      const card =
        this.querySelector(".widget-card") ?? this.shadowRoot?.querySelector(".widget-card") ?? null;
      if (!card) {
        return;
      }
      card.style.cssText =
        "box-shadow: none; border-width: 0; background-color: transparent; border-radius: 0px; padding: 0px; margin: 0px;";
    }

    /**
     * L'ombre « carte » peut aussi porter sur le wrapper du bloc en light DOM
     * (le div « custom-block » au-dessus de <sb-custom-block>), via les classes
     * designer-branding-shadow / designer-branding-border-radius. On remonte
     * depuis notre élément en traversant la shadow root de la plateforme,
     * puis on neutralise le branding par override inline sur les ancêtres
     * concernés. Scopé aux classes : si la plateforme change sa structure,
     * le style réapparaît simplement (pas d'erreur).
     */
    private removeBlockBranding(): void {
      let node: Element | null = this;
      // Traverser la (ou les) shadow root(s) : le widget est rendu dans la
      // shadow root de la plateforme, le wrapper du bloc est en light DOM.
      while (node) {
        const root = node.getRootNode();
        if (root instanceof ShadowRoot) {
          node = root.host;
        } else {
          break;
        }
      }
      // Remonter les ancêtres light DOM (borné : le wrapper est à quelques niveaux)
      for (let depth = 0; node && depth < 5; depth++) {
        if (node.classList.contains("designer-branding-shadow")) {
          node.style.boxShadow = "none";
        }
        if (node.classList.contains("designer-branding-border-radius")) {
          node.style.borderRadius = "0px";
        }
        node = node.parentElement;
      }
    }

    /**
     * The observed attributes, where the widgets reacts on.
     */
    public static get observedAttributes(): string[] {
      return widgetAttributes;
    }

    /**
     * Callback invoked on every change of an observed attribute. Call the parental method before
     * applying own logic.
     */
    public attributeChangedCallback(...args: [string, string | undefined, string | undefined]): void {
      super.attributeChangedCallback.apply(this, args);
    }
  };
};

/**
 * The definition of the block, to let it successful register to the hosting application
 */
const blockDefinition: BlockDefinition = {
    name: "date-widget",
    factory: factory,
    attributes: widgetAttributes,
    blockLevel: 'block',
    configurationSchema: configurationSchema,
    uiSchema: uiSchema,
    label: 'Date Widget',
    iconUrl: icon
};

/**
 * Wrapping definition, which defines meta informations about the block.
 */
const externalBlockDefinition: ExternalBlockDefinition = {
  blockDefinition,
  author: pkg.author,
  version: pkg.version
};

/**
 * This call is mandatory to register the block in the hosting application.
 */
window.defineBlock(externalBlockDefinition);
