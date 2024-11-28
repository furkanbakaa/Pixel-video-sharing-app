import { Account, Avatars, Client, Databases, ID, Query, Storage } from "react-native-appwrite";
export const appwriteConfig = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.bakaf.pixel",
  projectId: "6745cf57000c99d0a12f",
  databaseId: "6745d05c00087af0ca80",
  userCollectionId: "6745d0720018c137d3ec",
  videoCollcetionId: "6745d08f003a9ac66b0d",
  storageId: "6745d1dc0011bfb39a65",
};

const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client);

export const createUser = async (email, password, username) => {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    )
    if(!newAccount) throw Error;

    const avatarUrl = avatars.getInitials(username)

    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email,
        username,
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error) {
    console.log(error);
    throw new Error (error);
  }
};


export const userSignIn = async (email, password) => {
  try {
      const currenSession = await account.getSession("current").catch(() => null);
      if(currenSession){
        //Eğer oturum varsa, mevcut oturumu sil ve yeni oturum oluştur
        await account.deleteSession("current");
      }

      const session = await account.createEmailPasswordSession(email, password);
      return session;
  } catch (error) {
      throw new Error(error)
  }
}

export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    throw new Error(error);
  }
}

export const getCurrentUser = async () => {
  try {
    //Mevcut kullanıcıyı al
    const currentAccount = await account.get();

    if(!currentAccount) throw Error;

    //Kullanıcı bilgilerini veritabanından getir
    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if(!currentUser.documents.length) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    console.log(error)
  }
}

export const getAllPosts = async () => {

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollcetionId,
      [Query.orderDesc("$createdAt")]
    )

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

export const getLatestPosts = async () => {

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollcetionId,
      [Query.orderDesc("$createdAt", Query.limit(7))]
    )

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

export const searchPosts = async (query) => {

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollcetionId,
      [Query.search("title", query)]
    )

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

export const getUserPosts = async (userId) => {

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollcetionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
    )

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

export const signOut = async () => {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    throw new Error (error)
  }
}

export const getFilePreview = async (fileId, type) => {
  let fileUrl;

  try {
    if(type === "video") {
      fileUrl = storage.getFileView(appwriteConfig.storageId ,fileId)
    } else if ( type === "image") {
      fileUrl = storage.getFilePreview(appwriteConfig.storageId, fileId, 2000,2000,"top",100)
    }else {
      throw new Error("Invalid file type")
    }

    if(!fileUrl) throw Error;

    return fileUrl;

  } catch (error) {
    throw new Error(error);
  }
}

export const uploadFile = async (file, type) => {
  if(!file) return;

  const {mimeType, ...rest} = file;
  const asset = {
    name: file.fileName,
    type :file.mimeType,
    size: file.fileSize,
    uri: file.uri,
  }


  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      asset
    );


    const fileUrl= await getFilePreview(uploadedFile.$id, type);

    return fileUrl;
  } catch (error) {
    throw new Error(error);
  }
}

export const createVideo = async (form) => {
  try {
    const [thumbnailUrl, videoUrl] = await Promise.all([
      uploadFile(form.thumbnail, "image"),
      uploadFile(form.video, "video"),
    ])

    const newPost = await databases.createDocument(
      appwriteConfig.databaseId, appwriteConfig.videoCollcetionId, ID.unique(), {
        title: form.title,
        thumbnail: thumbnailUrl,
        video: videoUrl,
        prompt: form.prompt,
        creator: form.userId
      }
    )

    return newPost;
  } catch (error) {
    throw new Error(error)
  }
}