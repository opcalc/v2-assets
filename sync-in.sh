rsync -avz ../images/ images
rsync -avz ../lib/ lib
rm -rf lib/dist
rm -rf lib/src
mkdir lib/dist
rsync -avz ../lib/dist/*.min.* lib/dist
cp ../favicon.ico ./
