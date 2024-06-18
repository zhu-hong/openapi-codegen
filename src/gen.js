import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import * as prettier from 'prettier'
import swagger from '../swagger.json'

const CONTENT_TYPE = 'application/json'

const INTERFACE_PREFIX = 'I'

const isRefObj = (schema) => Object.hasOwnProperty.call(schema, '$ref') ? schema['$ref'] : false

const fieldWithNameAndRequired = (name, required, typeString) => name ? `${name}${required?'':'?'}: ${typeString}` : typeString

const capitalized = (word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`

const getPathMethodKey = (path, method) => capitalized(method) + path.split('/').map((word) => {
  const match = word.match(/\{(\w+)\}/)
  if(match?.[1]) {
    return capitalized(`by${capitalized(match[1].toLowerCase())}`)
  }
  return capitalized(word)
}).join('')

/**
 * @description 获取tag,从restfulAPI的规范出发,可以理解为有多少种tag就有多少种resource
 */
const getTags = () => swagger.tags.map(({ name }) => name)

/**
 * @description 根据tag来筛选出API路径和方法,以此来得出所有的api和请求需要的参数,响应的数据的数据模型
 */
const getPathsByTag = (tag) => Object.keys(swagger.paths).map((path) => ({
  path,
  methods: Object.keys(swagger.paths[path]).map((method) => swagger.paths[path][method].tags.find((t) => t === tag) ? method : false).filter(Boolean)
})).filter((p) => p.methods.length > 0)

/**
 * @description 简单递归下,解出所有字段及其类型
 * onReceiveRefObj是为按需获取用到的$ref
 */
const parseSchemaObj = (schema, fieldName, required = false, onReceiveRefObj) => {
  const refObj = isRefObj(schema)
  if(refObj) {
    onReceiveRefObj?.(refObj)
    const refKey = refObj.split('/').at(-1)
    return fieldWithNameAndRequired(fieldName, required, `${INTERFACE_PREFIX}${refKey}`)
  }

  const { type } = schema

  if(type === 'object') {
    const { required: requiredKeys = [] } = schema
    if(!schema.properties && schema.additionalProperties) {
      return `{${parseSchemaObj(schema.additionalProperties, '[prop: string]', true, onReceiveRefObj)}}`
    }
    const typeString = `{${Object.keys(schema.properties).map((key) => {
      return parseSchemaObj(schema.properties[key], key, requiredKeys.includes(key), onReceiveRefObj)
    }).join('\n')}}`
    return fieldWithNameAndRequired(fieldName, required, typeString)
  } else if(type === 'array') {
    const itemType = parseSchemaObj(schema.items, '', true, onReceiveRefObj)
    return fieldWithNameAndRequired(fieldName, required, `(${itemType})[]`)
  } else if(type === 'integer' || type === 'number') {
    return fieldWithNameAndRequired(fieldName, required, 'number')
  } else if(type === 'string') {
    const { enum: enumValues } = schema

    let typeString = 'string'
    if(enumValues !== undefined) {
      typeString = enumValues.map((v) => `'${v}'`).join(' | ')
    }

    return fieldWithNameAndRequired(fieldName, required, typeString)
  } else if(type === 'boolean') {
    return fieldWithNameAndRequired(fieldName, required, 'boolean')
  } else {
    return fieldWithNameAndRequired(fieldName, required, 'unknown')
  }
}

const genByTag = async (tag) => {
  const interfaceCodes = []
  const httpRequestCodes = []
  const refObjs = new Set([])
  const onReceiveRefObj = (obj) => refObjs.add(obj)

  const paths = getPathsByTag(tag)
  const pathsInfo = swagger.paths

  paths.forEach(({ path, methods }) => {
    methods.forEach((method) => {
      const key = getPathMethodKey(path, method)

      const pathInfo = pathsInfo[path][method]
      const { parameters, requestBody, responses } = pathInfo

      // 解析接口请求参数类型
      const payloadTypeStrings = []
      if(parameters !== undefined && parameters.length > 0) {
        const paramTypeString = parameters.filter((p) => p.in === 'path').map((p) => {
          const { summary, description } = p
          let JSDoc = ''
          if(summary || description) {
            JSDoc = `/**
              ${Object.keys({summary,description}).filter((k) => p[k]).map((k) => `* @${k} ${p[k]}`).join('\n')}
            */`
          }
          return `${JSDoc}
          ${parseSchemaObj(p.schema, p.name, p.required, onReceiveRefObj)}`
        }).join('\n')
        if(paramTypeString.trim() !== '') {
          payloadTypeStrings.push(`params:{${paramTypeString}}`)
        }

        const queryTypeString = parameters.filter((q) => q.in === 'query').map((q) => {
          const { summary, description } = q
          let JSDoc = ''
          if(summary || description) {
            JSDoc = `/**
              ${Object.keys({summary,description}).filter((k) => q[k]).map((k) => `* @${k} ${q[k]}`).join('\n')}
            */`
          }
          return `${JSDoc}
          ${parseSchemaObj(q.schema, q.name, q.required, onReceiveRefObj)}`
        }).join('\n')
        if(queryTypeString.trim() !== '') {
          payloadTypeStrings.push(`querys?:{${queryTypeString}}`)
        }
      }
      if(requestBody !== undefined) {
        const { summary, description } = requestBody
        let JSDoc = ''
        if(summary || description) {
          JSDoc = `/**
            ${Object.keys({summary,description}).filter((k) => requestBody[k]).map((k) => `* @${k} ${requestBody[k]}`).join('\n')}
          */`
        }
        if(Object.hasOwnProperty.call(requestBody.content, 'application/octet-stream')) {
          payloadTypeStrings.push(`${JSDoc?`${JSDoc}\n`:''}data: FormData`)
        } else {
          const typeString = parseSchemaObj(requestBody.content[CONTENT_TYPE].schema, '', requestBody.required ?? false, onReceiveRefObj)
          payloadTypeStrings.push(`${JSDoc?`${JSDoc}\n`:''}data: ${typeString}`)
        }
      }

      const payloadTypeString = payloadTypeStrings.join('\n')
      let payloadInterfaceString = ''
      if(payloadTypeString.trim() !== '') {
        payloadInterfaceString = `${INTERFACE_PREFIX}${key}Payload`
        interfaceCodes.push({
          exported: true,
          name: payloadInterfaceString,
          code: `export interface ${payloadInterfaceString} {${payloadTypeString}}`,
        })
      }

      // 解析接口响应数据类型
      let responseInterfaceString = ''
      if(responses !== undefined) {
        let target = responses['200']?.content ?? responses['201']?.content ?? responses['202']?.content ?? responses['204']?.content ?? responses['default']?.content
        if(target !== undefined) {
          const schema = target[CONTENT_TYPE].schema
          const typeString = parseSchemaObj(schema, '', false, onReceiveRefObj)
          responseInterfaceString = `${INTERFACE_PREFIX}${key}Response`
          if(isRefObj(schema) || schema.type !== 'object') {
            interfaceCodes.push({
              exported: true,
              name: responseInterfaceString,
              code: `export type ${responseInterfaceString} = ${typeString}`,
            })
          } else {
            interfaceCodes.push({
              exported: true,
              name: responseInterfaceString,
              code: `export interface ${responseInterfaceString} ${typeString}`,
            })
          }
        }
      }

      let url = path
      let params = parameters?.filter((p) => p.in === 'path').map(({ name }) => name)
      if(params && params.length > 0) {
        params.forEach((param) => {
          url = `\`${url.replaceAll(`{${param}}`, `\${payload.params.${param}}`)}\``
        })
      } else {
        url = `'${path}'`
      }

      let JSDoc = ''
      const { summary, description } = pathInfo
      if(summary || description) {
        JSDoc = `/**
          ${Object.keys({summary,description}).filter((k) => pathInfo[k]).map((k) => `* @${k} ${pathInfo[k]}`).join('\n')}
        */`
      }

      // 生成接口请求代码
      httpRequestCodes.push(`${JSDoc}
        export const ${key} = (${payloadInterfaceString?`payload: ${payloadInterfaceString}, `:''}config: AxiosRequestConfig = {}) => {
        return axios.${method}<${responseInterfaceString||'void'}>(${url}, ${['get','delete'].includes(method)?'':`${requestBody?'payload.data':'null'},`} {
          ${parameters?.filter((p) => p.in === 'query').length>0?'params: payload.querys,':''}...config,
        })
      }`)
    })
  })

  while (refObjs.size > 0) {
    const refObj = [...refObjs].pop()
    refObjs.delete(refObj)
    const name = refObj.split('/').at(-1)
    const schema = refObj.split('/').reduce((p, c) => c === '#' ? p : p[c], swagger)
    const typeString = parseSchemaObj(schema, '', true, onReceiveRefObj)
    const interfaceName = `${INTERFACE_PREFIX}${name}`
    if(isRefObj(schema) || schema.type !== 'object') {
      interfaceCodes.unshift({
        exported: false,
        name: interfaceName,
        code: `type ${interfaceName} = ${typeString}`,
      })
    } else {
      interfaceCodes.unshift({
        exported: false,
        name: interfaceName,
        code: `interface ${interfaceName} ${typeString}`,
      })
    }
  }

  writeFile(
    resolve(process.cwd(), 'src/types.gen.ts'),
    Buffer.from(
      await prettier.format(
        interfaceCodes.map(({ code }) => code).join('\n\n'),
        {
          semi: false,
          singleQuote: true,
          parser: 'typescript',
        }
      )
    )
  )

  writeFile(
    resolve(process.cwd(), 'src/http.gen.ts'),
    Buffer.from(
      await prettier.format(
        `import axios from 'axios'
        import type { AxiosRequestConfig } from 'axios'
        import type { ${interfaceCodes.filter(({ exported }) => exported).map(({ name }) => name).join(', ')} } from './types.gen'
        \n
        ${httpRequestCodes.join('\n\n')}`,
        {
          semi: false,
          singleQuote: true,
          parser: 'typescript',
        }
      )
    )
  )
}

genByTag('pet')
