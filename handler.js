'use strict';

var crypto = require('crypto-js')
var AWS = require('aws-sdk')

module.exports.list = (event, context, callback) => {
  try {
    listMediaSpace({bucketName:"SOME_AWS_BUCKET", accessKey: "SOME_AWS_KEY_ID", bucketRegion: "SOME_AWS_REGION"}, "SOME_AWS_SECRET_KEY").then(
        data => {
          const response = {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          };
          callback(null, response);
        },
        err => {
          const response = {
            statusCode: 500,
            body: err.message,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          };
          callback(null, response);
        }
    )

  } catch (err) {
    console.log(err)
    const response = {
      statusCode: 500,
      body: err.message,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    };
    callback(null, response);
  }
};

module.exports.sign = (event, context, callback) => {
  try {
    signRequest(event.body, "SOME_AWS_SECRET_KEY").then(
        data => {
          const response = {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          };
          callback(null, response);
        },
        err => {
          const response = {
            statusCode: 500,
            body: err.message,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            }
          };
          callback(null, response);
        }
    )

  } catch (err) {
    console.log(err)
    const response = {
      statusCode: 500,
      body: err.message,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    };
    callback(null, response);
  }
};

function listMediaSpace(mediaSpaceInfo, clearSecretKey) {
  return new Promise(function (resolve, reject) {
    try {
      var s3 = new AWS.S3({accessKeyId: mediaSpaceInfo.accessKey, secretAccessKey: clearSecretKey, region: mediaSpaceInfo.bucketRegion})
      var params = {
        Bucket: mediaSpaceInfo.bucketName
      }
      listAllKeys(s3, params).then(
          resolve,
          reject
      )
    } catch (err) {
      reject(err)
    }
  })
}

function signRequest(requestBody, clearSecretKey) {
  return new Promise(function (resolve, reject) {
    try {
      let jsonBody = JSON.parse(requestBody)
      if (jsonBody.headers) {
        resolve(signHeaders(jsonBody.headers, clearSecretKey))
      } else {
        let creds = ''
        jsonBody.conditions.forEach(c => {
          for (var property in c) {
            if (c.hasOwnProperty(property) && property === 'x-amz-credential') {
              creds = c[property]
            }
          }
        })
        if (creds === '') {
          reject(new Error('cannot find credentials part'))
        } else {
          resolve(signPolicy(requestBody, creds, clearSecretKey))
        }
      }
    } catch (err) {
      reject(err)
    }
  })
}

function listAllKeys (s3, params) {
  return new Promise(function (resolve, reject) {
    var allKeys = []
    s3.listObjectsV2(params, function (err, data) {
      if (err) {
        reject(err)
      } else {
        var contents = data.Contents
        contents.forEach(function (content) {
          var signParams = {Bucket: params.Bucket, Key: content.Key, Expires: 14400} // 4hours expiry
          var url = s3.getSignedUrl('getObject', signParams)
          allKeys.push({
            key: content.Key,
            created: content.LastModified,
            signedUrl: url
          })
        })

        if (data.IsTruncated) {
          params.ContinuationToken = data.NextContinuationToken
          listAllKeys(s3, params, loghead).then(
              resolve,
              reject
          )
        } else {
          resolve(allKeys)
        }
      }
    })
  })
}

function getSignatureKey (key, dateStamp, regionName, serviceName) {
  var kDate = crypto.HmacSHA256(dateStamp, 'AWS4' + key)
  var kRegion = crypto.HmacSHA256(regionName, kDate)
  var kService = crypto.HmacSHA256(serviceName, kRegion)
  var kSigning = crypto.HmacSHA256('aws4_request', kService)
  return kSigning
}

function signPolicy (policy, credential, clearSecretKey) {
  let base64Policy = Buffer.from(policy).toString('base64')
  console.log(base64Policy)
  let parts = credential.split('/')
  let dateStamp = parts[1]
  let region = parts[2]
  let service = parts[3]

  let signedKey = getSignatureKey(clearSecretKey, dateStamp, region, service)
  let signature = crypto.HmacSHA256(base64Policy, signedKey).toString(crypto.enc.Hex)

  return { 'policy': base64Policy, 'signature': signature }
}

function signHeaders (headers, clearSecretKey) {
  let parts = headers.split('\n')
  console.log(parts)
  let canonicalRequest = parts.slice(3).join('\n')
  console.log(canonicalRequest)
  let algorithm = parts[0]
  let amzDate = parts[1]
  let credentialScope = parts[2]
  let toSign = algorithm + '\n' + amzDate + '\n' + credentialScope + '\n' + crypto.SHA256(canonicalRequest).toString(crypto.enc.Hex)

  let credsPart = credentialScope.split('/')
  let dateStamp = credsPart[0]
  let region = credsPart[1]
  let service = credsPart[2]
  let signedKey = getSignatureKey(clearSecretKey, dateStamp, region, service)
  let signature = crypto.HmacSHA256(toSign, signedKey).toString(crypto.enc.Hex)
  return {'signature': signature}
}