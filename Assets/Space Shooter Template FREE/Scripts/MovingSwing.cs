using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MovingSwing : MonoBehaviour
{
    [Tooltip("Moving speed to assigned target")]
    public float speed;
    Vector3 targetPoint;
    GameObject target;
    Transform targetTransform;
    float x;
    float y;
    float a;
    public float direction;
    public void Start()
    {
        x = transform.position.x;
        y = transform.position.y;
        a = 218.25f;
    }
    //moving the object with the defined speed
    private void Update()
    {
        if(x <= 6 && x >= -6) x += 0.03f * direction;
        else
        {
            Destroy(gameObject);
        }
        float temp = a - (Mathf.Pow(x, 2));
        float i;
        i = temp > 0 ? 1 : 1;
        i = i == 0 ? 0 : -1;
        y = Mathf.Sqrt(Mathf.Abs(temp))* i+19.5f;
        Debug.Log("x: " + x + "y :" + y);
        transform.position = new Vector3(x, y, transform.position.z);
        transform.rotation = Quaternion.Euler(0, 0, (25 / 6 * x));
    }
}
