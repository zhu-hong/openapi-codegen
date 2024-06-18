interface ICategory {
  id?: number
  name?: string
}

interface ITag {
  id?: number
  name?: string
}

interface IPet {
  id?: number
  name: string
  category?: ICategory
  photoUrls: string[]
  tags?: ITag[]
  status?: 'available' | 'pending' | 'sold'
}

interface IApiResponse {
  code?: number
  type?: string
  message?: string
}

export interface IPutPetPayload {
  /**
   * @description Update an existent pet in the store
   */
  data: IPet
}

export type IPutPetResponse = IPet

export interface IPostPetPayload {
  /**
   * @description Create a new pet in the store
   */
  data: IPet
}

export type IPostPetResponse = IPet

export interface IGetPetFindByStatusPayload {
  querys?: {
    /**
     * @description Status values that need to be considered for filter
     */
    status?: 'available' | 'pending' | 'sold'
  }
}

export type IGetPetFindByStatusResponse = IPet[]

export interface IGetPetFindByTagsPayload {
  querys?: {
    /**
     * @description Tags to filter by
     */
    tags?: string[]
  }
}

export type IGetPetFindByTagsResponse = IPet[]

export interface IGetPetByPetidPayload {
  params: {
    /**
     * @description ID of pet to return
     */
    petId: number
  }
}

export type IGetPetByPetidResponse = IPet

export interface IPostPetByPetidPayload {
  params: {
    /**
     * @description ID of pet that needs to be updated
     */
    petId: number
  }
  querys?: {
    /**
     * @description Name of pet that needs to be updated
     */
    name?: string

    /**
     * @description Status of pet that needs to be updated
     */
    status?: string
  }
}

export interface IDeletePetByPetidPayload {
  params: {
    /**
     * @description Pet id to delete
     */
    petId: number
  }
}

export interface IPostPetByPetidUploadImagePayload {
  params: {
    /**
     * @description ID of pet to update
     */
    petId: number
  }
  querys?: {
    /**
     * @description Additional Metadata
     */
    additionalMetadata?: string
  }
  data: FormData
}

export type IPostPetByPetidUploadImageResponse = IApiResponse
