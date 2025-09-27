from pathlib import Path
path = Path(r"d:\CFL Project\GRADUS\admin\src\masterLayout\MasterLayout.jsx")
text = path.read_text()
if "const ADMIN_ROLE_LABELS" not in text:
    text = text.replace(
        "import useAuth from \"../hook/useAuth\";\n\nconst MasterLayout = ({ children }) => {",
        "import useAuth from \"../hook/useAuth\";\n\nconst ADMIN_ROLE_LABELS = {\n  admin: 'Admin',\n  programmer_admin: 'Programmer (Admin)',\n};\n\nconst MasterLayout = ({ children }) => {"
    )
path.write_text(text)