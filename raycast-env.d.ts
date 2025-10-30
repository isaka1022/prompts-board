/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Supabase URL - Your Supabase project URL */
  "supabaseUrl": string,
  /** Supabase Anon Key - Your Supabase anonymous key */
  "supabaseAnonKey": string,
  /** MCP Server URL - The base URL for the MCP server */
  "mcpBaseUrl": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `login` command */
  export type Login = ExtensionPreferences & {}
  /** Preferences accessible in the `user-profile` command */
  export type UserProfile = ExtensionPreferences & {}
  /** Preferences accessible in the `add-prompt` command */
  export type AddPrompt = ExtensionPreferences & {}
  /** Preferences accessible in the `search-prompt` command */
  export type SearchPrompt = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `login` command */
  export type Login = {}
  /** Arguments passed to the `user-profile` command */
  export type UserProfile = {}
  /** Arguments passed to the `add-prompt` command */
  export type AddPrompt = {}
  /** Arguments passed to the `search-prompt` command */
  export type SearchPrompt = {}
}

