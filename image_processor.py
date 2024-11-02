from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox
from PIL import Image, ImageTk
import json
from datetime import datetime

class ImageProcessor:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Image Processor")
        self.root.geometry("800x600")
        
        self.setup_ui()
        
    def setup_ui(self):
        # Main frame
        self.main_frame = tk.Frame(self.root)
        self.main_frame.pack(expand=True, fill='both', padx=10, pady=10)
        
        # Buttons
        self.btn_frame = tk.Frame(self.main_frame)
        self.btn_frame.pack(fill='x', pady=5)
        
        tk.Button(self.btn_frame, text="Open Image", command=self.open_image).pack(side='left', padx=5)
        tk.Button(self.btn_frame, text="Save Info", command=self.save_metadata).pack(side='left', padx=5)
        
        # Image display
        self.image_label = tk.Label(self.main_frame)
        self.image_label.pack(pady=10)
        
        # Info display
        self.info_text = tk.Text(self.main_frame, height=10, width=60)
        self.info_text.pack(pady=10)
        
    def open_image(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("Image files", "*.png *.jpg *.jpeg *.gif *.bmp")]
        )
        if file_path:
            try:
                with Image.open(file_path) as img:
                    # Resize image to fit display
                    display_size = (400, 400)
                    img.thumbnail(display_size)
                    
                    # Convert to PhotoImage for display
                    photo = ImageTk.PhotoImage(img)
                    self.image_label.config(image=photo)
                    self.image_label.image = photo
                    
                    # Display metadata
                    metadata = {
                        "Filename": Path(file_path).name,
                        "Size": f"{img.size[0]}x{img.size[1]}",
                        "Format": img.format,
                        "Mode": img.mode,
                        "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
                    
                    self.info_text.delete(1.0, tk.END)
                    for key, value in metadata.items():
                        self.info_text.insert(tk.END, f"{key}: {value}\n")
                    
            except Exception as e:
                messagebox.showerror("Error", f"Failed to open image: {str(e)}")
    
    def save_metadata(self):
        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json")]
        )
        if file_path:
            try:
                metadata = self.info_text.get(1.0, tk.END)
                with open(file_path, 'w') as f:
                    json.dump({"metadata": metadata}, f, indent=4)
                messagebox.showinfo("Success", "Metadata saved successfully!")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save metadata: {str(e)}")
    
    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = ImageProcessor()
    app.run()