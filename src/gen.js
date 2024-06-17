import swagger from '../swagger.json'
import * as prettier from 'prettier'
import { writeFile } from 'fs/promises'

// const CONTENT_TYPE = 'application/json'

// const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

// requestBody parameters

const INTERFACE_PREFIX = 'I'

const isRefObj = (schema) => {
  if(Object.hasOwnProperty.call(schema, '$ref')) {
    return schema['$ref']
  }
  return false
}

const fieldWithNameAndRequired = (name, required, typeString) => name ? `${name}${required?'':'?'}: ${typeString};` : typeString

/**
 * @description 获取tag,从restfulAPI的规范出发,可以理解为有多少种tag就有多少种resource
 */
const getTags = () => {
  return swagger.tags.map(({ name }) => name)
}

/**
 * @description 根据tag来筛选出API路径和方法,以此来得出所有的api和请求需要的参数,响应的数据的数据模型
 */
const getPathsByTag = (tag) => Object.keys(swagger.paths).map((path) => ({
  path,
  methods: Object.keys(swagger.paths[path]).map((method) => swagger.paths[path][method].tags.find((t) => t === tag) ? method : false).filter(Boolean)
})).filter((p) => p.methods.length > 0)

/**
 * 简单递归下,解出所有字段/类型
 */
const parseSchemaObj = (schema, name, required = false) => {
  const refObj = isRefObj(schema)
  if(refObj) {
    const refKey = refObj.split('/').at(-1)
    return fieldWithNameAndRequired(name, required, `${INTERFACE_PREFIX}${refKey}`)
  }

  const { type } = schema

  if(type === 'object') {
    const { required = [] } = schema
    const typeString = `{${Object.keys(schema.properties).map((key) => {
      return parseSchemaObj(schema.properties[key], key, required.includes(key))
    }).join('\n')}}`
    return fieldWithNameAndRequired(name, required, typeString)
  } else if(type === 'array') {
    const itemType = parseSchemaObj(schema.items)
    return fieldWithNameAndRequired(name, required, `(${itemType})[]`)
  } else if(type === 'integer' || type === 'number') {
    return fieldWithNameAndRequired(name, required, 'number')
  } else if(type === 'string') {
    const { enum: enumValues } = schema

    let typeString = 'string'
    if(enumValues !== undefined) {
      typeString = enumValues.map((v) => `'${v}'`).join(' | ')
    }

    return fieldWithNameAndRequired(name, required, typeString)
  } else if(type === 'boolean') {
    return fieldWithNameAndRequired(name, required, 'boolean')
  } else {
    return fieldWithNameAndRequired(name, required, 'unknown')
  }
}

const genSchemaTypeString = (schema, name) => `export interface ${INTERFACE_PREFIX}${name} ${parseSchemaObj(schema)}`

const pathsInfo = swagger.paths
const paths = getPathsByTag(getTags()[0])

paths.forEach(({ path, methods }) => {
  console.log(path)
  methods.forEach((method) => {
    const { parameters, requestBody } = pathsInfo[path][method]
    // if(parameters !== undefined) {
    // }
    // if(requestBody !== undefined) {
    // }
  })
})
