pub(crate) fn extract_sub_board_targets(content: &str) -> Vec<String> {
    extract_sub_board_links(content)
        .into_iter()
        .map(|(target, _title)| target)
        .collect()
}

pub(crate) fn extract_sub_board_links(content: &str) -> Vec<(String, Option<String>)> {
    let mut targets = Vec::new();
    let mut in_target_section = false;

    for line in content.lines() {
        if line.starts_with("## ") {
            in_target_section = line.trim() == "## Sub Boards";
            continue;
        }

        if !in_target_section {
            continue;
        }

        if let Some(link) = extract_bullet_link(line.trim()) {
            targets.push(link);
        }
    }

    targets
}

pub(crate) fn extract_bullet_link_target(line: &str) -> Option<String> {
    extract_bullet_link(line).map(|(target, _title)| target)
}

pub(crate) fn extract_bullet_link(line: &str) -> Option<(String, Option<String>)> {
    if !line.starts_with("- [[") && !line.starts_with("* [[") {
        return None;
    }

    let start = line.find("[[")?;
    let end = line.find("]]")?;
    let inner = &line[start + 2..end];
    let mut parts = inner.split('|');
    let target = parts.next().unwrap_or_default().trim();
    let title = parts.collect::<Vec<_>>().join("|").trim().to_string();

    if target.is_empty() {
        None
    } else {
        Some((
            target.to_string(),
            if title.is_empty() { None } else { Some(title) },
        ))
    }
}

pub(crate) fn read_board_title_from_content(content: &str, fallback: &str) -> String {
    if let Some(frontmatter_title) = read_frontmatter_title(content) {
        return frontmatter_title;
    }

    for line in content.lines() {
        if let Some(title) = line.strip_prefix("# ") {
            let trimmed = title.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }

    fallback.to_string()
}

fn read_frontmatter_title(content: &str) -> Option<String> {
    let mut lines = content.lines();
    if lines.next()?.trim() != "---" {
        return None;
    }

    for line in lines {
        let trimmed = line.trim();
        if trimmed == "---" {
            break;
        }

        if let Some(title) = trimmed.strip_prefix("title:") {
            let cleaned = title.trim().trim_matches('"').trim_matches('\'');
            if !cleaned.is_empty() {
                return Some(cleaned.to_string());
            }
        }
    }

    None
}

pub(crate) fn remove_board_target_from_markdown(original: &str, target: &str) -> String {
    let normalized_target = normalize_wikilink_target(target);
    let filtered_lines = original
        .lines()
        .filter(|line| {
            extract_bullet_link_target(line.trim())
                .map(|line_target| normalize_wikilink_target(&line_target) != normalized_target)
                .unwrap_or(true)
        })
        .collect::<Vec<_>>();

    format!("{}\n", filtered_lines.join("\n").trim_end())
}

pub(crate) fn remove_card_from_board_markdown(original: &str, slug: &str) -> String {
    let filtered_lines = original
        .lines()
        .filter(|line| !is_deleted_card_bullet_line(line.trim(), slug))
        .collect::<Vec<_>>();

    format!("{}\n", filtered_lines.join("\n").trim_end())
}

pub(crate) fn rewrite_wikilinks_for_rename(
    original: &str,
    prefix: &str,
    old_slug: &str,
    new_slug: &str,
    new_title: &str,
) -> String {
    let mut rewritten = String::with_capacity(original.len());
    let mut remainder = original;

    while let Some(start) = remainder.find("[[") {
        let (before, after_start) = remainder.split_at(start);
        rewritten.push_str(before);

        let Some(end) = after_start.find("]]") else {
            rewritten.push_str(after_start);
            return rewritten;
        };

        let inner = &after_start[2..end];
        let target = inner.split('|').next().unwrap_or_default().trim();
        let normalized = normalize_wikilink_target(target);
        let expected_prefixed_target = format!("{prefix}/{old_slug}");

        if normalized == expected_prefixed_target || normalized == old_slug {
            rewritten.push_str(&format!("[[{prefix}/{new_slug}|{new_title}]]"));
        } else {
            rewritten.push_str(&after_start[..end + 2]);
        }

        remainder = &after_start[end + 2..];
    }

    rewritten.push_str(remainder);
    rewritten
}

pub(crate) fn replace_sub_board_section(
    original: &str,
    sub_boards: &[(String, Option<String>)],
) -> String {
    let mut kept_lines = Vec::new();
    let mut skipping_sub_boards = false;

    for line in original.lines() {
        if line.starts_with("## ") {
            if line.trim() == "## Sub Boards" {
                skipping_sub_boards = true;
                continue;
            }

            if skipping_sub_boards {
                skipping_sub_boards = false;
            }
        }

        if !skipping_sub_boards {
            kept_lines.push(line);
        }
    }

    let mut rebuilt = kept_lines.join("\n").trim_end().to_string();

    if !sub_boards.is_empty() {
        if !rebuilt.is_empty() {
            rebuilt.push_str("\n\n");
        }

        rebuilt.push_str("## Sub Boards");
        for (target, title) in sub_boards {
            match title {
                Some(title) => rebuilt.push_str(&format!("\n\n- [[{target}|{title}]]")),
                None => rebuilt.push_str(&format!("\n\n- [[{target}]]")),
            }
        }
    }

    rebuilt.push('\n');
    rebuilt
}

pub(crate) fn normalize_wikilink_target(target: &str) -> String {
    target
        .trim_start_matches("./")
        .trim_end_matches(".md")
        .replace('\\', "/")
}

fn is_deleted_card_bullet_line(line: &str, slug: &str) -> bool {
    if !line.starts_with("- [[") && !line.starts_with("* [[") {
        return false;
    }

    let Some(start) = line.find("[[") else {
        return false;
    };
    let Some(end) = line.find("]]") else {
        return false;
    };

    let inner = &line[start + 2..end];
    let target = inner.split('|').next().unwrap_or_default().trim();
    let normalized = target
        .trim_start_matches("./")
        .trim_end_matches(".md")
        .replace('\\', "/");
    let normalized_slug = normalized.strip_prefix("cards/").unwrap_or(&normalized);

    normalized_slug == slug
}

#[cfg(test)]
mod tests {
    use super::{
        extract_sub_board_links, remove_board_target_from_markdown, replace_sub_board_section,
        rewrite_wikilinks_for_rename,
    };

    #[test]
    fn rewrites_card_links_for_rename() {
        let original =
            "## Todo\n\n- [[cards/old-card|Old Card]]\n- [[cards/other-card|Other Card]]\n";
        let updated =
            rewrite_wikilinks_for_rename(original, "cards", "old-card", "new-card", "New Card");

        assert!(updated.contains("[[cards/new-card|New Card]]"));
        assert!(updated.contains("[[cards/other-card|Other Card]]"));
    }

    #[test]
    fn rewrites_board_links_for_rename() {
        let original = "## Sub Boards\n\n- [[child/TODO|Old Board]]\n";
        let updated =
            rewrite_wikilinks_for_rename(original, "boards", "old-board", "new-board", "New Board");

        assert!(updated.contains("[[child/TODO|Old Board]]"));
    }

    #[test]
    fn removes_deleted_board_bullets() {
        let original = "## Sub Boards\n\n- [[child/remove-me/TODO|Remove Me]]\n- [[child/keep-me/TODO|Keep Me]]\n";
        let updated = remove_board_target_from_markdown(original, "child/remove-me/TODO");

        assert!(!updated.contains("remove-me"));
        assert!(updated.contains("keep-me"));
    }

    #[test]
    fn replaces_sub_board_section() {
        let original =
            "# Board\n\n## Todo\n\n- [[cards/task|Task]]\n\n## Sub Boards\n\n- [[old/TODO|Old]]\n";
        let updated = replace_sub_board_section(
            original,
            &[("child/TODO".to_string(), Some("Child".to_string()))],
        );

        assert!(updated.contains("## Sub Boards\n\n- [[child/TODO|Child]]"));
        assert!(!updated.contains("old/TODO"));
    }

    #[test]
    fn extracts_sub_board_links_with_optional_titles() {
        let original = "## Sub Boards\n\n- [[child/TODO|Child]]\n\n- [[plain/TODO]]\n";

        assert_eq!(
            extract_sub_board_links(original),
            vec![
                ("child/TODO".to_string(), Some("Child".to_string())),
                ("plain/TODO".to_string(), None),
            ],
        );
    }
}
