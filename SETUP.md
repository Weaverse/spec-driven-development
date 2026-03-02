# Setting Up Spec-Driven Development

## Step 1: Add the convention file

Copy [`SPEC-DRIVEN-DEVELOPMENT.md`](./SPEC-DRIVEN-DEVELOPMENT.md) to your project root:

```bash
curl -o SPEC-DRIVEN-DEVELOPMENT.md https://raw.githubusercontent.com/hta218/spec-driven-development/main/SPEC-DRIVEN-DEVELOPMENT.md
```

The file contains everything: principles, structures, and rules.

## Step 2: Use it

Work with your preferred planning tool or agent as normal. Just mention the convention file when prompting:

> Follow `SPEC-DRIVEN-DEVELOPMENT.md` and ...

## Step 3: Test it (optional)

Try this sample prompt with your agent to see if it work:

```
I want to add a users' preferences feature to the app. Users should be able
to choose and save their preferred settings like default theme, layout, notifications, and language...
Their preference should be saved to our database to be applied across the app.

Must follow @SPEC-DRIVEN-DEVELOPMENT.md
```

Your agent should create a spec folder (e.g. `.specs/001--users-preferences--2026-03-02/`) with a README and plan before writing any code.
