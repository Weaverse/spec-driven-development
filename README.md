# Spec-Driven Development (SDD)

**Problem**: AI writes most of the code now. We can't read it all anymore — but we still need to understand it (what it does, why it exists, what files it touches,...) in order to maintain and evolve the codebase effectively.

SDD is a simple convention: before building a feature, create a short spec. Before modifying a feature, read its spec (and update if necessary). That's it!

One markdown file. One folder structure. Works with any AI agent or workflow.

## Get started

### Step 1: Add the convention file

Copy [`SPEC-DRIVEN-DEVELOPMENT.md`](./SPEC-DRIVEN-DEVELOPMENT.md) to your project root:

```bash
curl -o SPEC-DRIVEN-DEVELOPMENT.md https://raw.githubusercontent.com/Weaverse/spec-driven-development/main/SPEC-DRIVEN-DEVELOPMENT.md
```

### Step 2: There is no step 2. You're good to go.

Now when working with your preferred planning tool or agent. Just mention the convention file when prompting:

> Follow `SPEC-DRIVEN-DEVELOPMENT.md` and ...

For example (assuming you have the `/feature-plan` command set up with your agent):
```
/feature-plan I want to add a users' preferences feature to the app. Users should be able
to choose and save their preferred settings like default theme, layout, notifications, and language...
Their preference should be saved to our database to be applied across the app.

Must follow @SPEC-DRIVEN-DEVELOPMENT.md
```

## Contributing

PRs are welcome!

---

The Weaverse Team 🤝
