export interface Lugar {
  id: string;
  ciudad: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  ubicacion?: string;
  tags: string[];
  imagenes_url: string[];
  pagina_web?: string;
}

