

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'funding');
  formData.append('cloud_name', 'defswxqkw'); // optional if preset handles it

  try {
    const response = await fetch(
      'https://api.cloudinary.com/v1_1/defswxqkw/image/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.secure_url; // this is what you store in Firebase
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

