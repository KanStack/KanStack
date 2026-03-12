pub(crate) fn extract_sub_board_targets(content: &str) -> Vec<String> {
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

        if let Some(target) = extract_bullet_link_target(line.trim()) {
            targets.push(target);
        }
    }

    targets
}

pub(crate) fn extract_bullet_link_target(line: &str) -> Option<String> {
    if !line.starts_with("- [[") && !line.starts_with("* [[") {
        return None;
    }

    let start = line.find("[[")?;
    let end = line.find("]]")?;
    let inner = &line[start + 2..end];
    let target = inner.split('|').next().unwrap_or_default().trim();

    if target.is_empty() {
        None
    } else {
        Some(target.to_string())
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
    use super::{remove_board_target_from_markdown, rewrite_wikilinks_for_rename};

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
}
