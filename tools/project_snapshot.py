import ast
import re
import shutil
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path("tools/output")
MIGRATION_DIR = OUTPUT_DIR / "migration"

PROJECT_EXPORT_FILE = MIGRATION_DIR / "project_export.txt"
PROJECT_EXPORT_NOTION_FILE = MIGRATION_DIR / "project_export_notion.txt"
project_name = Path.cwd().name

MERGED_FILE = (
    OUTPUT_DIR
    / f"000_{project_name}_snapshot.txt"
)
MERGED_NOTION_FILE = (
    OUTPUT_DIR
    / f"000_{project_name}_snapshot_notion.txt"
)

EXCLUDE_DIRS = {
    ".git",
    ".venv",
    "__pycache__",
    "output",
    "node_modules",
    ".next",
    ".turbo",
    ".idea",
    ".vscode",
}

DATA_EXTENSIONS = {
    ".csv": "CSV",
    ".json": "JSON",
    ".txt": "TXT",
    ".yaml": "YAML",
    ".yml": "YAML",
}

SOURCE_EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
}

MIGRATION_ROOT_DIRS = {
    "src",
    "docs",
    "tools",
}

MIGRATION_ROOT_FILES = {
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "README.md",
}

MIGRATION_TEXT_EXTENSIONS = {
    ".css",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}

SOURCE_CODE_ROOT_DIRS = {
    "src",
    "docs",
}

SOURCE_CODE_TEXT_EXTENSIONS = {
    ".css",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}


def should_skip(path: Path) -> bool:
    try:
        if OUTPUT_DIR.resolve() in path.resolve().parents:
            return True

    except Exception:
        pass

    return any(part in EXCLUDE_DIRS for part in path.parts)


def read_text_file(path: Path) -> str:

    for encoding in ("utf-8", "utf-8-sig", "cp932"):
        try:
            return path.read_text(encoding=encoding)

        except UnicodeDecodeError:
            continue

        except Exception as e:
            return f"<<READ ERROR: {e}>>"

    return "<<READ ERROR: unsupported text encoding>>"


def relative_paths(root: Path) -> list[Path]:

    return sorted(
        (
            path
            for path in root.rglob("*")
            if not should_skip(path)
        ),
        key=lambda p: str(p.relative_to(root)),
    )


def files_with_suffixes(root: Path, suffixes: set[str]) -> list[Path]:

    return [
        path
        for path in relative_paths(root)
        if path.is_file() and path.suffix in suffixes
    ]


def format_relative(root: Path, path: Path) -> str:

    return path.relative_to(root).as_posix()


def format_size(size: int) -> str:

    return f"{size} bytes"


def is_entry_point(root: Path, path: Path) -> bool:

    relative = path.relative_to(root)

    if path.name in {
        "main.py",
        "app.py",
        "server.py",
        "manage.py",
    }:
        return True

    if path.name.startswith("run") and path.suffix == ".py":
        return True

    if relative.as_posix() == "src/app/page.tsx":
        return True

    if relative.as_posix().startswith("src/app/") and path.name in {
        "page.tsx",
        "page.ts",
        "route.ts",
        "route.tsx",
    }:
        return True

    return False


def is_run_file(path: Path) -> bool:

    return path.is_file() and path.suffix == ".py" and path.name.startswith("run")


def source_module_dirs(root: Path) -> list[str]:

    modules = set()

    for path in files_with_suffixes(root, SOURCE_EXTENSIONS):
        relative = path.relative_to(root)

        if len(relative.parts) == 1:
            modules.add(".")
        else:
            modules.add(relative.parts[0])

    return sorted(modules)


def data_like_files(root: Path) -> list[Path]:

    data_roots = {
        "data",
        "config",
        "configs",
        "docs",
    }

    return [
        path
        for path in files_with_suffixes(root, set(DATA_EXTENSIONS))
        if path.relative_to(root).parts[0] in data_roots
    ]


def imports_from_python(path: Path) -> list[str]:

    try:
        tree = ast.parse(read_text_file(path))
    except SyntaxError:
        return []

    imports = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name.split(".")[0])

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.add(node.module.split(".")[0])

            elif node.level > 0:
                imports.add("." * node.level)

    return sorted(imports)


def python_module_index(root: Path) -> dict[str, Path]:

    index = {}

    for path in files_with_suffixes(root, {".py"}):
        relative = path.relative_to(root).with_suffix("")
        dotted = ".".join(relative.parts)

        index[dotted] = path
        index[path.stem] = path

    return index


def internal_python_dependencies(root: Path, path: Path, index: dict[str, Path]) -> list[Path]:

    try:
        tree = ast.parse(read_text_file(path))
    except SyntaxError:
        return []

    dependencies = set()
    current_parts = path.relative_to(root).with_suffix("").parts
    package_parts = current_parts[:-1]

    for node in ast.walk(tree):
        candidates = []

        if isinstance(node, ast.Import):
            candidates.extend(alias.name for alias in node.names)

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                if node.level > 0:
                    base_parts = package_parts[:max(len(package_parts) - node.level + 1, 0)]
                    candidates.append(".".join([*base_parts, node.module]))
                else:
                    candidates.append(node.module)

            for alias in node.names:
                if alias.name == "*":
                    continue

                if node.module:
                    base = node.module
                    if node.level > 0:
                        base_parts = package_parts[:max(len(package_parts) - node.level + 1, 0)]
                        base = ".".join([*base_parts, node.module])

                    candidates.append(f"{base}.{alias.name}")

                elif node.level > 0:
                    base_parts = package_parts[:max(len(package_parts) - node.level + 1, 0)]
                    candidates.append(".".join([*base_parts, alias.name]))

        for candidate in candidates:
            parts = candidate.split(".")

            while parts:
                key = ".".join(parts)
                dependency = index.get(key)

                if dependency is not None and dependency != path:
                    dependencies.add(dependency)
                    break

                parts.pop()

    return sorted(dependencies, key=lambda p: str(p.relative_to(root)))


def build_tree(root: Path) -> list[str]:

    lines = []

    for path in sorted(
        root.rglob("*"),
        key=lambda p: str(p.relative_to(root)),
    ):

        if should_skip(path):
            continue

        relative = path.relative_to(root)

        indent = "  " * (len(relative.parts) - 1)

        if path.is_dir():
            lines.append(f"{indent}[D] {relative.name}")

        else:
            lines.append(f"{indent}[F] {relative.name}")

    return lines


def build_project_manifest(root: Path) -> str:

    source_files = files_with_suffixes(root, SOURCE_EXTENSIONS)
    python_files = files_with_suffixes(root, {".py"})
    manifest_data_files = data_like_files(root)

    output = []

    output.append(f"PROJECT: {project_name}")
    output.append("")

    output.append("ENTRY POINTS")
    output.append("")
    entry_points = [path for path in source_files if is_entry_point(root, path)]
    if entry_points:
        for path in entry_points:
            output.append(f"* {format_relative(root, path)}")
    else:
        output.append("(none)")
    output.append("")

    output.append("RUN FILES")
    output.append("")
    run_files = [path for path in python_files if is_run_file(path)]
    if run_files:
        for path in run_files:
            output.append(f"* {format_relative(root, path)}")
    else:
        output.append("(none)")
    output.append("")

    output.append("DATA FILES")
    output.append("")
    for label in sorted(set(DATA_EXTENSIONS.values())):
        files = [
            path for path in manifest_data_files
            if DATA_EXTENSIONS[path.suffix] == label
        ]

        if not files:
            continue

        output.append(label)
        output.append("")
        for path in files:
            output.append(f"* {format_relative(root, path)}")
        output.append("")

    if not manifest_data_files:
        output.append("(none)")
        output.append("")

    output.append("SOURCE MODULES")
    output.append("")
    modules = source_module_dirs(root)
    if modules:
        for module in modules:
            output.append(f"{module}/" if module != "." else "./")
    else:
        output.append("(none)")
    output.append("")

    output.append("IMPORT SUMMARY")
    output.append("")
    if python_files:
        for path in python_files:
            output.append(format_relative(root, path))
            output.append("imports:")
            imports = imports_from_python(path)

            if imports:
                for imported in imports:
                    output.append(imported)
            else:
                output.append("(none)")

            output.append("")
    else:
        output.append("(none)")
        output.append("")

    return "\n".join(output).rstrip()


def build_dependency_map(root: Path) -> str:

    python_files = files_with_suffixes(root, {".py"})
    index = python_module_index(root)
    output = []

    output.append("DEPENDENCY MAP")
    output.append("")

    if not python_files:
        output.append("(none)")

    for path in python_files:
        dependencies = internal_python_dependencies(root, path, index)
        output.append(format_relative(root, path))

        if dependencies:
            for dependency in dependencies:
                output.append(f"-> {format_relative(root, dependency)}")
        else:
            output.append("-> (none)")

        output.append("")

    return "\n".join(output).rstrip()


def build_data_inventory(root: Path) -> str:

    data_root = root / "data"
    output = []

    output.append("DATA INVENTORY")
    output.append("")

    if not data_root.exists():
        output.append("(none)")
        return "\n".join(output).rstrip()

    data_files = [
        path
        for path in sorted(
            data_root.rglob("*"),
            key=lambda p: str(p.relative_to(root)),
        )
        if path.is_file() and not should_skip(path)
    ]

    grouped = {}

    for path in data_files:
        label = DATA_EXTENSIONS.get(path.suffix, path.suffix.upper().lstrip(".") or "NO_EXTENSION")
        grouped.setdefault(label, []).append(path)

    if not grouped:
        output.append("(none)")
    else:
        for label in sorted(grouped):
            output.append(label)
            output.append("")

            for path in grouped[label]:
                output.append(f"* {format_relative(root, path)} ({format_size(path.stat().st_size)})")

            output.append("")

    return "\n".join(output).rstrip()


def infer_architecture_sections(
    project_manifest: str,
    data_inventory: str,
    dependency_map: str,
    project_tree: str,
) -> dict[str, str]:

    context = "\n".join([
        project_manifest,
        data_inventory,
        dependency_map,
        project_tree,
    ]).lower()
    has_bom_explorer = "bomcostexplorer" in context or "src/app/explorer" in context
    has_rolled_bom = "snapshot_rolled_bom_state.csv" in context
    has_unit_cost = "snapshot_unit_cost_state.csv" in context
    has_quality = "quality.ts" in context or "qualityissue" in context or "quality" in context
    has_purchase_events = "purchase_events" in context

    if has_bom_explorer and has_rolled_bom:
        purpose = (
            "`snapshot_rolled_bom_state.csv` を検索・探索し、"
            "BOM構成、原価内訳、Quality Issueを確認するためのBOM Viewer。"
        )

        if has_unit_cost:
            purpose += "\n`snapshot_unit_cost_state.csv` も集計済み原価snapshotとして参照対象にする。"

        responsibilities = [
            "- Read configured input data",
            "- Render interactive application views",
            "- Filter and inspect loaded records",
            "- Export filtered client-side data",
        ]
        in_scope = [
            "- Snapshot閲覧",
            "- 部品・機種・サプライヤ検索",
            "- BOM階層/グループ表示",
            "- 原価内訳確認",
            "- 品質確認",
            "- CSV Export",
        ]
        out_of_scope = [
            "- BOM積上計算",
            "- 原価計算",
            "- 購買価格決定",
            "- purchase_events からの正規化・状態生成",
            "- マスタデータ管理",
        ]

        if not has_purchase_events:
            out_of_scope.remove("- purchase_events からの正規化・状態生成")

        data_flow = [
            "`snapshot_rolled_bom_state.csv`",
            "↓",
            "BomCostExplorer",
            "↓",
            "検索・階層探索",
            "↓",
            "原価内訳確認 / Quality Issue確認",
            "↓",
            "CSV Export",
        ]
    else:
        purpose = (
            f"`{project_name}` の主要entry point、source module、data file、"
            "dependencyを整理し、AIと人間がプロジェクト構造を理解するためのアプリケーション。"
        )
        responsibilities = [
            "- entry pointの提供",
            "- data fileの読み込み",
            "- UIまたは処理モジュールによるデータ表示・確認",
            "- project snapshot/migration artifactの生成",
        ]
        in_scope = [
            "- Life Cardsのデッキ一覧UI",
            "- 既存snapshot/data fileの閲覧",
            "- プロジェクト構成の把握",
            "- AI理解用metadata生成",
        ]
        out_of_scope = [
            "- 外部システム連携",
            "- source dataの恒久管理",
            "- migration artifact以外での完全復元保証",
        ]
        data_flow = [
            "src/data/decks",
            "↓",
            "src/app/page.tsx / src/components",
            "↓",
            "Deck grid UI",
            "↓",
            "AI snapshot / migration export",
        ]

    return {
        "PROJECT PURPOSE": purpose,
        "RESPONSIBILITY": "\n".join(responsibilities),
        "IN SCOPE": "\n".join(in_scope),
        "OUT OF SCOPE": "\n".join(out_of_scope),
        "MAIN DATA FLOW": "\n".join(data_flow),
    }


def path_exists_in_tree(project_tree: str, path: str) -> bool:

    return all(part in project_tree for part in path.split("/"))


def read_csv_header(path: Path) -> list[str]:

    if not path.exists():
        return []

    first_line = read_text_file(path).splitlines()[0:1]

    if not first_line:
        return []

    return [
        column.strip()
        for column in first_line[0].lstrip("\ufeff").split(",")
        if column.strip()
    ]


def referenced_csv_files(root: Path) -> list[str]:

    references = set()
    pattern = re.compile(r"[\"']([^\"']+\.csv)[\"']")
    scan_roots = [
        root / dirname
        for dirname in SOURCE_CODE_ROOT_DIRS
        if (root / dirname).exists()
    ]

    for scan_root in scan_roots:
        for path in sorted(scan_root.rglob("*"), key=lambda p: str(p.relative_to(root))):
            if should_skip(path) or not path.is_file():
                continue

            if path.suffix not in SOURCE_CODE_TEXT_EXTENSIONS:
                continue

            for match in pattern.finditer(read_text_file(path)):
                references.add(match.group(1))

    return sorted(references)


def route_from_page_file(root: Path, path: Path) -> str:

    relative = path.relative_to(root).as_posix()
    prefix = "src/app/"

    if not relative.startswith(prefix) or not relative.endswith("/page.tsx"):
        return ""

    route = relative[len(prefix):-len("/page.tsx")]

    return "/" if route == "" else f"/{route}"


def source_files_containing(root: Path, pattern: str) -> list[str]:

    matches = []

    for path in source_code_files(root):
        if pattern in read_text_file(path):
            matches.append(format_relative(root, path))

    return matches


def build_dependency_contract_section(root: Path) -> str:

    csv_reads = referenced_csv_files(root)
    fs_reads = source_files_containing(root, "readFileSync")
    fs_writes = sorted(set(
        source_files_containing(root, "writeFileSync") +
        source_files_containing(root, "appendFileSync")
    ))
    browser_downloads = source_files_containing(root, ".download")
    routes = [
        route
        for route in (
            route_from_page_file(root, path)
            for path in sorted((root / "src/app").rglob("page.tsx"))
        )
        if route
    ]
    output = [
        "UPSTREAM",
        "",
        "(not declared in code)",
        "",
        "READ",
        "",
    ]

    if csv_reads:
        output.extend(f"* {path}" for path in csv_reads)
    elif fs_reads:
        output.extend(f"* filesystem read in {path}" for path in fs_reads)
    else:
        output.append("(none)")

    output.extend([
        "",
        "WRITE",
        "",
    ])

    writes = []

    writes.extend(f"* filesystem write in {path}" for path in fs_writes)
    writes.extend(f"* browser download in {path}" for path in browser_downloads)

    if writes:
        output.extend(writes)
    else:
        output.append("(none)")

    output.extend([
        "",
        "OUTPUT",
        "",
    ])

    outputs = []
    outputs.extend(f"* route {route}" for route in routes)
    outputs.extend(f"* browser download from {path}" for path in browser_downloads)

    if outputs:
        output.extend(outputs)
    else:
        output.append("(none)")

    output.extend([
        "",
        "OWNERSHIP",
        "",
        "Read Only for referenced input files",
    ])

    return "\n".join(output)


def build_referenced_files_section(root: Path) -> str:

    csv_reads = referenced_csv_files(root)
    fs_reads = source_files_containing(root, "readFileSync")
    fs_writes = sorted(set(
        source_files_containing(root, "writeFileSync") +
        source_files_containing(root, "appendFileSync")
    ))
    browser_downloads = source_files_containing(root, ".download")
    output = [
        "READ",
        "",
    ]

    if csv_reads:
        output.extend(f"* {path}" for path in csv_reads)
    elif fs_reads:
        output.extend(f"* filesystem read in {path}" for path in fs_reads)
    else:
        output.append("(none)")

    output.extend([
        "",
        "WRITE",
        "",
    ])

    writes = []
    writes.extend(f"* filesystem write in {path}" for path in fs_writes)
    writes.extend(f"* browser download in {path}" for path in browser_downloads)

    if writes:
        output.extend(writes)
    else:
        output.append("(none)")

    return "\n".join(output)


def build_key_implementation_section(root: Path, project_tree: str) -> str:

    sections = []

    if path_exists_in_tree(project_tree, "src/app/page.tsx"):
        sections.append("\n".join([
            "FILE:",
            "src/app/page.tsx",
            "",
            "ROLE:",
            "Home entry point / デッキ一覧",
            "",
            "RESPONSIBILITY:",
            "",
            "* Life Cardsのタイトル表示",
            "* Private Decksセクション表示",
            "* decks dataをDeckCardへ渡す",
            "* 2列/4列のデッキグリッド表示",
        ]))

    if path_exists_in_tree(project_tree, "src/components/DeckCard.tsx"):
        sections.append("\n".join([
            "FILE:",
            "src/components/DeckCard.tsx",
            "",
            "ROLE:",
            "デッキカードUI",
            "",
            "RESPONSIBILITY:",
            "",
            "* coverImageまたは抽象グラデーション背景を表示",
            "* deck name / card count / private-shared labelを表示",
            "* 小さなカード束の重なりをCSSで表現",
        ]))

    if path_exists_in_tree(project_tree, "src/data/decks/decks.ts"):
        sections.append("\n".join([
            "FILE:",
            "src/data/decks/decks.ts",
            "",
            "ROLE:",
            "デモデッキデータ",
            "",
            "RESPONSIBILITY:",
            "",
            "* Deck型に沿った初期データを提供",
            "* Home画面の表示対象を管理",
        ]))

    if path_exists_in_tree(project_tree, "src/lib/types.ts"):
        sections.append("\n".join([
            "FILE:",
            "src/lib/types.ts",
            "",
            "ROLE:",
            "データ契約",
            "",
            "RESPONSIBILITY:",
            "",
            "* Deck / Cardの基本型を定義",
            "* UIとデモデータの共有契約を維持",
        ]))

    if path_exists_in_tree(project_tree, "src/app/explorer/BomCostExplorer.tsx"):
        sections.append("\n".join([
            "FILE:",
            "src/app/explorer/BomCostExplorer.tsx",
            "",
            "ROLE:",
            "メインUI / BOM Explorer",
            "",
            "RESPONSIBILITY:",
            "",
            "* Search",
            "* Snapshot Filter",
            "* Group",
            "* BOM View",
            "* Hit View",
            "* Quality Issue Panel",
            "* CSV Export",
            "",
            "MAJOR FUNCTIONS:",
            "",
            "* recordMatchesQuery()",
            "* buildSeriesGroups()",
            "* buildSnapshotOptions()",
            "* buildExplorerIndex()",
            "* buildHitRows()",
            "* exportCsv() / downloadCsv()",
            "* SummaryTable",
            "* HitView",
            "* BomDetailTable",
            "* SelectedRowQualityPanel",
            "",
            "IMPORTANT STATE:",
            "",
            "* queryState",
            "* selectedFields",
            "* searchMode",
            "* selectedSnapshot",
            "* activeView",
            "* expandedSeries",
            "* expandedTspecs",
            "* selectedRecord",
            "",
            "IMPORTANT LOGIC:",
            "",
            "* Match Mode: partial / exact",
            "* Search Field selection: tspec, model, part, supplier",
            "* Snapshot selection filters records by snapshot_end_date",
            "* Product grouping uses model series and natural model-name sort",
            "* BOM View expands series and TSPEC-level detail tables",
            "* Hit View lists matched BOM rows and direct child rows",
            "* Export target is filtered to matched BOM groups",
            "* Selected row highlight drives the Quality Issue detail panel",
        ]))

    if path_exists_in_tree(project_tree, "src/app/explorer/quality.ts"):
        sections.append("\n".join([
            "FILE:",
            "src/app/explorer/quality.ts",
            "",
            "ROLE:",
            "Quality Issue判定",
            "",
            "RESPONSIBILITY:",
            "",
            "* Issue検出",
            "* Rule定義",
            "* TSPEC別Issue集約",
            "",
            "MAJOR FUNCTIONS:",
            "",
            "* buildPriceMissingIssues()",
            "* buildPriceOutlierIssues()",
            "* buildProductOutlierIssues()",
            "* buildQualityIssues()",
            "",
            "IMPORTANT LOGIC:",
            "",
            "* Missing price / process / material values are reported as issues",
            "* Part price outliers are detected by prefix and series median comparison",
            "* Product total cost outliers are detected by series median comparison",
            "* Issues carry severity, ruleId, message, partCode, and level",
        ]))

    if path_exists_in_tree(project_tree, "src/app/explorer/types.ts"):
        sections.append("\n".join([
            "FILE:",
            "src/app/explorer/types.ts",
            "",
            "ROLE:",
            "データ契約",
            "",
            "RESPONSIBILITY:",
            "",
            "* BOM row type",
            "* Quality Issue type",
            "* Quality result type",
            "* CSV列からUI fieldへのマッピング契約",
            "",
            "MAJOR TYPES:",
            "",
            "* BomRecord",
            "* QualityIssue",
            "* QualityLevel",
            "* QualityResult",
            "",
            "IMPORTANT LOGIC:",
            "",
            "* BomRecord keeps normalized UI fields plus rawRecord for CSV export",
            "* QualityIssue links rule/severity/message to optional partCode and level",
        ]))

    if path_exists_in_tree(project_tree, "src/app/explorer/page.tsx"):
        sections.append("\n".join([
            "FILE:",
            "src/app/explorer/page.tsx",
            "",
            "ROLE:",
            "Explorer entry point / data loader",
            "",
            "RESPONSIBILITY:",
            "",
            "* snapshot_rolled_bom_state.csv の読み込み",
            "* CSV rowをBomRecordへ変換",
            "* Quality Issue生成",
            "* BomCostExplorerへrecordsとcsvColumnsを渡す",
            "",
            "IMPORTANT LOGIC:",
            "",
            "* Input path is data/input/snapshot_rolled_bom_state.csv",
            "* rawRecord is preserved so filtered CSV export can keep original columns",
        ]))

    if not sections:
        return "(none)"

    return "\n\n---\n\n".join(sections)


def build_input_contract_section(root: Path) -> str:

    csv_references = referenced_csv_files(root)
    required_inputs = [
        reference
        for reference in csv_references
        if reference.endswith("snapshot_rolled_bom_state.csv")
    ]
    optional_inputs = [
        reference
        for reference in csv_references
        if reference not in required_inputs
    ]
    input_columns = {
        "data/input/snapshot_rolled_bom_state.csv": [
            "tspec",
            "model_name",
            "part_code",
            "part_name",
            "supplier_code",
            "unit",
            "procurement_cost",
            "process_cost",
            "internal_part_cost",
            "own_subtree_total_cost",
        ],
    }
    output = [
        "UPSTREAM",
        "",
        "(not declared in code)",
        "",
        "REQUIRED INPUTS",
        "",
    ]

    if required_inputs:
        for reference in required_inputs:
            output.append(reference)
            output.append("")

            columns = read_csv_header(root / reference)
            major_columns = [
                column
                for column in input_columns.get(reference, [])
                if not columns or column in columns
            ]

            if major_columns:
                output.append("主要列:")
                output.append("")
                output.extend(f"* {column}" for column in major_columns)
                output.append("")
    else:
        output.append("(none)")
        output.append("")

    output.extend([
        "OPTIONAL INPUTS",
        "",
    ])

    if optional_inputs:
        output.extend(optional_inputs)
    else:
        output.append("(none)")

    output.extend([
        "",
        "OUTPUTS",
        "",
        "* Next.js App Router pages",
        "* Life Cards deck list UI",
        "* Snapshot / migration text exports",
        "",
    ])

    return "\n".join(output).rstrip()


def should_include_in_source_code(root: Path, path: Path) -> bool:

    if should_skip(path):
        return False

    if not path.is_file():
        return False

    if "Zone.Identifier" in path.name:
        return False

    if any(part in {"node_modules", "public", "test-results"} for part in path.parts):
        return False

    if path.name == "package-lock.json":
        return False

    relative = path.relative_to(root)

    return (
        len(relative.parts) > 1
        and relative.parts[0] in SOURCE_CODE_ROOT_DIRS
        and path.suffix in SOURCE_CODE_TEXT_EXTENSIONS
    )


def source_code_files(root: Path) -> list[Path]:

    return [
        path
        for path in sorted(
            root.rglob("*"),
            key=lambda p: str(p.relative_to(root)),
        )
        if should_include_in_source_code(root, path)
    ]


def append_source_code_section(output: list[str], root: Path):

    output.append("====================")
    output.append("SOURCE CODE")
    output.append("====================")
    output.append("")

    files = source_code_files(root)

    if not files:
        output.append("(none)")
        output.append("")
        return

    for index, path in enumerate(files):
        if index > 0:
            output.append("--------------------------------")
            output.append("")

        output.append("# FILE:")
        output.append(format_relative(root, path))
        output.append("")
        output.append(read_text_file(path).rstrip())
        output.append("")


def append_snapshot_generator_section(output: list[str]):

    output.append("====================")
    output.append("SNAPSHOT GENERATOR")
    output.append("====================")
    output.append("")
    output.append("FILE:")
    output.append("tools/project_snapshot.py")
    output.append("")
    output.append("ROLE:")
    output.append("AI理解用Snapshot生成")
    output.append("")
    output.append("RESPONSIBILITY:")
    output.append("")
    output.append("* project tree収集")
    output.append("* data inventory収集")
    output.append("* dependency解析")
    output.append("* source code収集")
    output.append("* migration export生成")
    output.append("")
    output.append("OUT OF SCOPE:")
    output.append("")
    output.append("* life_cards本体機能")
    output.append("* 外部サービス連携")
    output.append("* データ同期")
    output.append("* UI操作の自動実行")
    output.append("")


def clean_migration_dir():

    MIGRATION_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    for path in MIGRATION_DIR.iterdir():
        if path.is_file():
            path.unlink()


def should_include_in_migration(root: Path, path: Path) -> bool:

    if should_skip(path):
        return False

    if not path.is_file():
        return False

    relative = path.relative_to(root)

    if len(relative.parts) == 1:
        return relative.name in MIGRATION_ROOT_FILES

    return (
        relative.parts[0] in MIGRATION_ROOT_DIRS
        and path.suffix in MIGRATION_TEXT_EXTENSIONS
    )


def migration_files(root: Path) -> list[Path]:

    return [
        path
        for path in sorted(
            root.rglob("*"),
            key=lambda p: str(p.relative_to(root)),
        )
        if should_include_in_migration(root, path)
    ]


def export_project_migration(root: Path):

    output = []
    files = migration_files(root)

    output.append(f"# PROJECT_NAME: {project_name}")
    output.append("# PROJECT_TYPE: nextjs")
    output.append("# EXPORT_VERSION: 1")

    for path in files:
        relative = format_relative(root, path)

        output.append("")
        output.append("# ==================================================")
        output.append(f"# FILE: {relative}")
        output.append("# ==================================================")
        output.append("")
        output.append(read_text_file(path))

    content = "\n".join(output).rstrip() + "\n"

    PROJECT_EXPORT_FILE.write_text(
        content,
        encoding="utf-8",
    )
    PROJECT_EXPORT_NOTION_FILE.write_text(
        content,
        encoding="utf-8-sig",
    )

    route_count = sum(
        1
        for path in files
        if (
            format_relative(root, path).startswith("src/app/api/")
            and path.name == "route.ts"
        )
    )

    print("MIGRATION EXPORT COMPLETE")
    print("project_export.txt: OK")
    print("project_export_notion.txt: OK")
    print(f"files exported: {len(files)}")
    print(f"route.ts exported: {route_count}")


def clean_output_dir():

    if not OUTPUT_DIR.exists():
        return

    for path in OUTPUT_DIR.iterdir():
        if not path.is_file():
            continue

        path.unlink()

    ai_understanding_dir = OUTPUT_DIR / "ai_understanding"

    if ai_understanding_dir.exists():
        shutil.rmtree(ai_understanding_dir)


def export_merged_snapshot(root: Path):

    def append_section(output: list[str], title: str, content: str):
        output.append(title)
        output.append("=" * len(title))
        output.append("")
        output.append(content.strip() or "(none)")
        output.append("")

    def section_from_text(text: str, title: str) -> str:
        lines = text.splitlines()
        titles = {
            "PROJECT PURPOSE",
            "RESPONSIBILITY",
            "IN SCOPE",
            "OUT OF SCOPE",
            "MAIN DATA FLOW",
            "NOTES",
            "ENTRY POINTS",
            "RUN FILES",
            "DATA FILES",
            "SOURCE MODULES",
            "IMPORT SUMMARY",
            "DEPENDENCY MAP",
            "DATA INVENTORY",
        }
        start = None

        for index, line in enumerate(lines):
            if line.strip() == title:
                start = index + 1
                break

        if start is None:
            return "(none)"

        while start < len(lines) and lines[start].strip() == "":
            start += 1

        end = len(lines)

        for index in range(start, len(lines)):
            if lines[index].strip() in titles:
                end = index
                break

        return "\n".join(lines[start:end]).strip() or "(none)"

    project_manifest = build_project_manifest(root)
    data_inventory = build_data_inventory(root)
    dependency_map = build_dependency_map(root)
    project_tree = "\n".join(build_tree(root))
    inferred_sections = infer_architecture_sections(
        project_manifest,
        data_inventory,
        dependency_map,
        project_tree,
    )

    output = []

    output.append("PROJECT")
    output.append(project_name)
    output.append("")
    output.append("GENERATED")
    output.append(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    output.append("")

    for title in (
        "PROJECT PURPOSE",
        "RESPONSIBILITY",
        "IN SCOPE",
        "OUT OF SCOPE",
        "MAIN DATA FLOW",
    ):
        append_section(
            output,
            title,
            inferred_sections[title],
        )

        if title == "RESPONSIBILITY":
            append_section(
                output,
                "DEPENDENCY CONTRACT",
                build_dependency_contract_section(root),
            )

    for title in (
        "ENTRY POINTS",
        "RUN FILES",
        "SOURCE MODULES",
    ):
        append_section(
            output,
            title,
            section_from_text(project_manifest, title),
        )

    append_section(
        output,
        "KEY IMPLEMENTATION",
        build_key_implementation_section(root, project_tree),
    )
    append_section(
        output,
        "INPUT CONTRACT",
        build_input_contract_section(root),
    )
    append_section(
        output,
        "REFERENCED FILES",
        build_referenced_files_section(root),
    )
    append_section(
        output,
        "DEPENDENCY SUMMARY",
        section_from_text(dependency_map, "DEPENDENCY MAP"),
    )
    append_section(
        output,
        "PROJECT TREE",
        project_tree,
    )
    append_snapshot_generator_section(output)
    append_source_code_section(output, root)

    content = "\n".join(output).rstrip() + "\n"

    MERGED_FILE.write_text(
        content,
        encoding="utf-8",
    )
    MERGED_NOTION_FILE.write_text(
        content,
        encoding="utf-8-sig",
    )

    print("SNAPSHOT COMPLETE")
    print("merged snapshot: OK")
    print("notion snapshot: OK")


def main():

    root = Path.cwd()

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    clean_output_dir()
    clean_migration_dir()

    export_merged_snapshot(root)
    export_project_migration(root)

    print("snapshot export completed")
    print(f"merged -> {MERGED_FILE}")
    print(f"notion -> {MERGED_NOTION_FILE}")
    print(f"files  -> {OUTPUT_DIR}")
    print(f"migration -> {PROJECT_EXPORT_FILE}")
    print(f"migration notion -> {PROJECT_EXPORT_NOTION_FILE}")
    print("")
    print("GENERATED FILES")
    for path in sorted(OUTPUT_DIR.rglob("*"), key=lambda p: str(p)):
        if path.is_file():
            print(f"- {path}")


if __name__ == "__main__":
    main()
