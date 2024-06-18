import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type {
  IPutPetPayload,
  IPutPetResponse,
  IPostPetPayload,
  IPostPetResponse,
  IGetPetFindByStatusPayload,
  IGetPetFindByStatusResponse,
  IGetPetFindByTagsPayload,
  IGetPetFindByTagsResponse,
  IGetPetByPetidPayload,
  IGetPetByPetidResponse,
  IPostPetByPetidPayload,
  IDeletePetByPetidPayload,
  IPostPetByPetidUploadImagePayload,
  IPostPetByPetidUploadImageResponse,
} from './types.gen'

/**
 * @summary Update an existing pet
 * @description Update an existing pet by Id
 */
export const PutPet = (
  payload: IPutPetPayload,
  config: AxiosRequestConfig = {},
) => {
  return axios.put<IPutPetResponse>('/pet', payload.data, {
    ...config,
  })
}

/**
 * @summary Add a new pet to the store
 * @description Add a new pet to the store
 */
export const PostPet = (
  payload: IPostPetPayload,
  config: AxiosRequestConfig = {},
) => {
  return axios.post<IPostPetResponse>('/pet', payload.data, {
    ...config,
  })
}

/**
 * @summary Finds Pets by status
 * @description Multiple status values can be provided with comma separated strings
 */
export const GetPetFindByStatus = (
  payload: IGetPetFindByStatusPayload,
  config: AxiosRequestConfig = {},
) => {
  return axios.get<IGetPetFindByStatusResponse>('/pet/findByStatus', {
    params: payload.querys,
    ...config,
  })
}

/**
 * @summary Finds Pets by tags
 * @description Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
 */
export const GetPetFindByTags = (
  payload: IGetPetFindByTagsPayload,
  config: AxiosRequestConfig = {},
) => {
  return axios.get<IGetPetFindByTagsResponse>('/pet/findByTags', {
    params: payload.querys,
    ...config,
  })
}

/**
 * @summary Find pet by ID
 * @description Returns a single pet
 */
export const GetPetByPetid = (
  payload: IGetPetByPetidPayload,
  config: AxiosRequestConfig = {},
) => {
  return axios.get<IGetPetByPetidResponse>(`/pet/${payload.params.petId}`, {
    ...config,
  })
}

/**
 * @summary Updates a pet in the store with form data
 */
export const PostPetByPetid = (
  payload: IPostPetByPetidPayload,
  config: AxiosRequestConfig = {},
) => {
  return axios.post<void>(`/pet/${payload.params.petId}`, null, {
    params: payload.querys,
    ...config,
  })
}

/**
 * @summary Deletes a pet
 */
export const DeletePetByPetid = (
  payload: IDeletePetByPetidPayload,
  config: AxiosRequestConfig = {},
) => {
  return axios.delete<void>(`/pet/${payload.params.petId}`, {
    ...config,
  })
}

/**
 * @summary uploads an image
 */
export const PostPetByPetidUploadImage = (
  payload: IPostPetByPetidUploadImagePayload,
  config: AxiosRequestConfig = {},
) => {
  return axios.post<IPostPetByPetidUploadImageResponse>(
    `/pet/${payload.params.petId}/uploadImage`,
    payload.data,
    {
      params: payload.querys,
      ...config,
    },
  )
}
