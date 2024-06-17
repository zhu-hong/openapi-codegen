export interface IPet {
  id?: number;
  name: string;
  category?: ICategory;
  photoUrls: (string)[];
  tags?: (ITag)[];
  status?: 'available' | 'pending' | 'sold';
}