use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    let path = Path::new(&path);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let mut file = fs::File::create(path).map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<serde_json::Value>, String> {
    let mut entries = Vec::new();

    let dir = fs::read_dir(&path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);

        entries.push(serde_json::json!({
            "name": name,
            "isDirectory": is_dir,
        }));
    }

    Ok(entries)
}

#[tauri::command]
pub fn ensure_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
pub fn resolve_path(path: String) -> Result<String, String> {
    let expanded = expand_tilde(&path)?;
    let absolute =
        fs::canonicalize(&expanded).map_err(|e| format!("Failed to resolve path: {}", e))?;

    Ok(absolute.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_config_path() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let config_path = home.join(".kanstack").join("config.json");
    Ok(config_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_default_data_path() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Failed to get home directory")?;
    let data_path = home.join(".kanstack").join("data");
    Ok(data_path.to_string_lossy().to_string())
}

fn expand_tilde(path: &str) -> Result<PathBuf, String> {
    if path.starts_with("~") {
        let home = dirs::home_dir().ok_or("Failed to get home directory")?;
        let rest = &path[1..]; // Remove the ~
        Ok(home.join(rest.trim_start_matches('/')))
    } else {
        Ok(PathBuf::from(path))
    }
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let expanded = expand_tilde(&path)?;
    trash::delete(&expanded).map_err(|e| format!("Failed to move file to trash: {}", e))
}

#[tauri::command]
pub fn delete_directory(path: String) -> Result<(), String> {
    let expanded = expand_tilde(&path)?;
    trash::delete(&expanded).map_err(|e| format!("Failed to move directory to trash: {}", e))
}

// Utility function to check if a path exists
#[tauri::command]
pub fn path_exists(path: String) -> Result<bool, String> {
    let expanded = expand_tilde(&path)?;
    Ok(expanded.exists())
}
