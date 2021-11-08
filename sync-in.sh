rsync -avz ../images/ images --delete-after
rsync -avz ../lib/ lib --delete-after
rm -rf lib/dist
rm -rf lib/src
mkdir lib/dist
rsync -avz ../lib/dist/*.min.* lib/dist
cp ../favicon.ico ./
