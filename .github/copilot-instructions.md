# NeatWork5 Project Instructions for GitHub Copilot

## IMPORTANT: Shell Command Conventions
- **The user's shell is PowerShell/CMD on Windows**
- **NEVER use `&&` for command chaining** - PowerShell does not support this
- **Use `;` (semicolon) to chain commands** in PowerShell
- Example: `cd path; python script.py` (NOT `cd path && python script.py`)
- For complex multi-line scripts, use proper PowerShell syntax or create separate .py/.ps1 files

## Project Overview
NeatWork5 is a Python-based network analysis application built with PySide6 (Qt) for GUI, featuring a sophisticated state management system, modular business logic, and extensible design patterns.

## Core Architecture Principles

### 1. **Minimal Defensive Coding Policy**
- **ONLY** implement defensive coding (try/catch, hasattr checks, None checks) when the same
code block applies to different steps in the UI creation process. That is,
when it simplifies the logic for keeping track of the transient UI state while it is being incremenetally
created as dialogs and tabbed panes are accessed by the user.
- Other than that, let exceptions bubble up naturally - this is intentional design
- catch exceptions when they have to do with external resources such as files,
network, etc. Those may be resolved by user action, so they need the opportunity
to try again.

### 2. **Separation of Concerns**
- **Core classes** (`src/core/`): Pure data models with `to_dict()` and `from_dict()` methods
- **Business logic** (`src/business/`): Managers that handle business operations and file I/O
- **GUI** (`src/gui/`): UI components, dialogs, models, and state management
- **State management** (`src/gui/state/`): Centralized state tracking with mixins

### 3. **State Management Architecture**
All stateful entities use a unified state management system:

#### State Managers with Mixins
```python
from gui.mixins import DirtyStateMixin, SaveControlMixin, SaveControlConfig

class ExampleStateManager(DirtyStateMixin, SaveControlMixin):
    def __init__(self, main_window):
        self.main_window = main_window
        self.__init_dirty_state__("Entity Name")
        self.__init_save_controls__([
            SaveControlConfig('save_button_name'),
            SaveControlConfig('action_save_name', 'action')
        ])
```

#### Save Controls Initialization
- State managers have `initialize_save_controls()` called after UI setup
- This disables save controls initially and sets up proper state tracking
- Save controls are automatically enabled/disabled based on dirty state

### 4. **Dialog Lifecycle Pattern**
All settings dialogs follow the same pattern:

#### Dialog Structure
```python
class SettingsDialog(QDialog):
    def __init__(self, parent):
        self.parent_window = parent
        self._force_close = False
        # Track dialog in state manager
        self.parent_window.app_state.entity_state.open_dialog = self
        
    def _setup_ui(self):
        # Create widget for functionality
        # Import and create tab manager
        # Setup unified button layout
        # Move lifecycle buttons to unified layout
        
    def closeEvent(self, event):
        # Check dirty state via state manager
        # Prompt for save if needed
        # Clear dialog reference from state manager
```

#### Tab Managers
- Handle the actual functionality and UI setup
- Provide `get_lifecycle_buttons()` method for unified button layout
- Use state manager methods for dirty/clean state tracking

### 5. **File Management Patterns**

#### Configuration Files
- Located in `conf/` directory at project root
- Default files: `default_catalog.nw5cat`, `default_attribute_templates.nw5tmpl`, `default_design_settings.nw5des`
- Active files: Same names without "default_" prefix
- Default files are copied to active files on first startup

#### Safe File Operations
- All saves use atomic operations (temp file + rename)
- File corruption protection with backup restoration
- JSON serialization with proper datetime handling

### 6. **Naming Conventions**

#### Files and Classes
- State managers: `*_state.py` containing `*StateManager`
- Business managers: `*_manager.py` containing `*Manager`
- Dialogs: `*_dialog.py` containing `*Dialog`
- Tab managers: `*_tab_mgr.py` containing `*TabManager`
- Models: `*_model.py` containing `*Model`

#### Methods
- Mark dirty: `mark_*_dirty()` (delegates to state manager)
- Mark clean: `mark_*_clean()` (delegates to state manager)
- State checking: `is_*_dirty()` or `has_dirty_*()` properties
- CRUD operations: `new*()`, `edit*()`, `delete*()`

### 7. **Error Handling Philosophy**
- **Fail fast and loudly** - don't hide errors
- Log errors with full context using the logging system
- Show meaningful error messages to users via QMessageBox
- Never implement fallback mechanisms unless explicitly requested

## Common Patterns

### Adding a New Settings Dialog
1. Create state manager inheriting from `DirtyStateMixin` and `SaveControlMixin`
2. Add state manager to `AppStateManager`
3. Create dialog following the lifecycle pattern
4. Create tab manager with `get_lifecycle_buttons()` method
5. Add menu action and handler to main window

### Working with State Management
```python
# Mark entity as dirty (enables save controls)
self.main_window.app_state.entity_state.mark_dirty()

# Mark entity as clean (disables save controls)  
self.main_window.app_state.entity_state.mark_clean()

# Check dirty state
if self.main_window.app_state.entity_state.is_dirty:
    # Handle unsaved changes
```

### Table Models with Dynamic Columns
- Inherit from appropriate base model
- Use `DynamicColumnMixin` for entity attributes
- Implement `get_dynamic_column_data()` for computed values
- Refresh columns when templates change

### Serialization
- Core classes have `to_dict()` and `from_dict()` methods
- Managers have `to_json()` and `from_json()` methods
- Always convert datetime objects to strings before JSON serialization
- Use ISO format for datetime strings

## Testing Patterns
- Unit tests in `test/unit/` mirroring `src/` structure
- Use `unittest` framework (not pytest)
- Mock external dependencies
- Test both success and failure paths

## File Structure Conventions

### Source Organization
```
src/
├── neatwork5.py          # Main application entry point
├── core/                 # Pure data models
├── business/             # Business logic managers
├── gui/
│   ├── dialogs/         # Dialog classes
│   ├── models/          # Table models
│   ├── state/           # State managers
│   ├── mixins/          # Reusable mixins
│   ├── manager/         # Tab managers
│   └── CRUD/            # CRUD operation handlers
└── utils/               # Utility functions
```

### Configuration Structure
```
conf/
├── default_catalog.nw5cat
├── default_attribute_templates.nw5tmpl
├── default_design_settings.nw5des
├── catalog.nw5cat              # Active files
├── attribute_templates.nw5tmpl
└── design_settings.nw5des
```

## Key Libraries and Dependencies
- **PySide6**: GUI framework (Qt for Python)
- **pandas**: Data manipulation for networks/nodes/links
- **numpy**: Numerical computations
- **json**: Configuration and project file format
- **logging**: Centralized logging system

## Development Guidelines
1. Always read existing similar code before implementing new features
2. Follow the established patterns exactly - consistency is critical
3. Use the logging system for debugging and error tracking
4. Update state management when adding new stateful entities
5. Test dirty state behavior for any new dialogs or forms
6. Maintain the separation between core, business, and GUI layers
7. Do not user the PUT, UPDATE and DELETE HTTP cerbs. Jus GET and POST. Query params specify values that are not part of the schema (such as how table navigation parameteres) )

## Common Gotchas
- State managers must be initialized after UI controls exist
- Dialog references must be cleared from state managers on close
- Save controls need proper initialization timing
- DateTime objects need string conversion before JSON serialization
- File operations should always be atomic to prevent corruption

## No backward compatiblity
- This code has not been delivered to users. There is no need for backward compatibility.
