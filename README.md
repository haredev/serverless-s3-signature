# serverless-s3-signature
Use Serverless Framework (Javascript) to sign AJAX/CORS requests on AWS Lambda for direct browser to S3 uploads . Drop in for fineUploaderS3

While using fineUploaderS3, we struggled to find serverless lambda javascript code that could just be deployed. Therfore we created this repo. 
You can find a good example of the uploader UI here: https://github.com/stratospark/react-fineuploader-s3-demo
We based our code on https://github.com/stratospark/zappa-s3-signature which is the python Alternative to this.

# To use:
* clone repo
* update AWS info in code (Bucket, Keys, Region)
* install serverless framework (https://serverless.com/framework/docs/providers/aws/guide/quick-start/)
* deploy: sls deploy
