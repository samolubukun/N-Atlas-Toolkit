# Contributing to N-ATLaS Toolkit

Thank you for your interest in contributing to the **N-ATLaS Toolkit**! We welcome contributions from developers, researchers, and linguists to make sovereign Nigerian AI accessible to everyone.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for all contributors, regardless of background or experience level.

---

## How Can You Contribute?

You can contribute in several ways:
1. **Reporting Bugs & Issues**: Open an issue detailing the bug, environment details, and minimal reproduction steps.
2. **Submitting Feature Requests**: Propose enhancements for SDK ergonomics, new deployment providers, or tools.
3. **Improving Documentation**: Fix typos, clarify guides, or add bilingual documentation (Yorùbá, Hausa, Igbo).
4. **Submitting Pull Requests (PRs)**: Add code improvements, tests, or bug fixes.

---

## Development Setup

### 1. Fork and Clone the Repository
```bash
git clone https://github.com/samolubukun/N-Atlas-Toolkit.git
cd N-Atlas-Toolkit
```

### 2. Python SDK Development
```bash
cd python-sdk
pip install -e ".[dev]"
pytest
```

### 3. JavaScript / TypeScript SDK Development
```bash
cd js-sdk
npm install
npm test
npm run build
```

### 4. Interactive Playground UI
```bash
cd playground
npm install
npm run dev
```

---

## Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names:
   - `feat/feature-name`
   - `fix/bug-description`
   - `docs/doc-updates`
2. **Commit Messages**: Keep commit messages clear, concise, and descriptive.
3. **Linting & Testing**: Ensure all existing tests pass and linting checks succeed prior to opening a PR.
4. **Documentation**: Update docstrings and relevant markdown files in `docs/` if modifying APIs or parameters.

---

## License

By contributing to this repository, you agree that your contributions will be licensed under the project's [Apache-2.0 License](LICENSE).
