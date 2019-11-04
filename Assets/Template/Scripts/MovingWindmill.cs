using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MovingWindmill : MonoBehaviour
{
    public float speed;
    // (도와주세요) speed 가 적용되지 않는 중
    float initVal, prevVal;
    float direction, x, totalX ;
    int disableFrame = 10;

    public void Start()
    {
        direction = -1;
        initVal = transform.eulerAngles.z;
        x = initVal + x;
    }
    //moving the object with the defined speed
    private void Update()
    {
        if (direction == 1 && x > 360+ initVal)
        {
            direction = -1 * direction;
            
        }
        else if(direction == -1  && x < 0 + initVal)
            direction = -1 * direction;
        
        x += direction * Time.deltaTime * speed;
        // speed += 0.2f;
        transform.rotation = Quaternion.Euler(0, 0, x);
        //disableFrame--;
    }
}
