# Script to generate a new block every minute
# Put this script at the root of your unpacked folder
#!/bin/bash

echo "Generating a block every minute. Press [CTRL+C] to stop.."

address="mn3FbgYPqgWbs9JHEtTQmBXsQ6gNvhuqbv"

while :
do
        echo "Generate a new block `date '+%d/%m/%Y %H:%M:%S'`"
        ~/bitcoin-0.21.0/bin/bitcoin-cli generatetoaddress 10 $address
        sleep 60
done