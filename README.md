# Json Schema to Firestore Rules Generator (js2fr)

This project is a fork of https://github.com/pheekus/svarog. The original project is no longer maintained. This fork is an attempt to keep the project alive and add new features.

`js2fr` is a CLI that helps you protect your [Firestore](https://cloud.google.com/firestore) schema from unwanted mutations. It generates a set of of helper functions based on [JSON Schema](https://json-schema.org) files that you can use in your [Security Rules](https://firebase.google.com/docs/firestore/security/get-started) to validate user input.

## Getting started

### Step 1: describe your schema

`js2fr` was designed to be compatible with [JSON Schema 7](https://json-schema.org/draft-07/json-schema-release-notes.html) - the latest draft of the JSON Schema standard. To get started, create a folder in your project directory, place your schema in a `*.schema.json` file and give it an `$id`. The `$id` field is **very important** as it will be used when calling the `isValid` function inside your firestore security rules:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "$id": "Apple",
  "type": "object",
  "properties": {
    "color": {
      "type": "string",
      "enum": ["green", "red"]
    }
  },
  "required": ["color"]
}
```
You can use any built-in type to describe your database schema. However, you should also keep in mind that not all of the JSON Schema features are [supported](docs/compatibility.md) at the moment.

#### Using Firestore data types

`js2fr` includes basic support for `Timestamp`, `Bytes`, `LatLng` and `Path` Firestore field types. To enable type checking on such fields, register the appropriate schemas in `definitions` section and then reference them in your main schema with `$ref` like this:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "$id": "FirestoreExample",
  "type": "object",
  "definitions": {
    "Timestamp": {}
  },
  "properties": {
    "date": { "$ref": "#/definitions/Timestamp" }
  }
}
```

### Step 2: run `js2fr`

Once you have your schema ready, install and run Svarog:

```bash
$ npm i -g @smallstack/json-schema-to-firestore-rules
$ js2fr "**/*.schema.json" "firestore.rules" --verbose
```

The last command will pull every file ending with `.schema.json`, run the compiler and append a minified code snippet to the `firestore.rules` file. You can run this command every time you update your schema, and it will replace the generated snippet for you automatically if both old and new helpers were created with the compatible versions of CLI.

### Step 3: call `isValid()` in Security Rules

The code we generated in the previous step exposes `isValid($id: string): boolean` function that you can use in your Security Rules together with other assertions:

```
match /apples/{appleId} {
  allow write: if isValid("Apple");
}
```

`js2fr` will apply a _strict_ schema check when a document is created (assuring that all required properties are present and nothing out of the schema is added), and a _loose_ one on each update (when some properties defined in schema may be missing from the patch object).

## CLI reference

```bash
USAGE
  $ js2fr INPUT [OUTPUT]

ARGUMENTS
  INPUT   input file containing JSON Schema or a glob pattern
  OUTPUT  target file where Svarog will output security rule helpers

OPTIONS
  -f, --force    overwrites existing Svarog code unconditionally
  -h, --help     displays this message
  -v, --verbose  enables progress logs during compilation
```
